# Linear Mutations (create / update / comment)

This skill can **write**, not just read. Mutations use the same endpoint, the same `LINEAR_API_KEY`, and the same `scripts/linear-query.sh` helper — you just send a `mutation { … }` with `$input` variables instead of a query. Verified against the live API: issue creation was run end-to-end; input schemas are introspected (`__type(name:"IssueCreateInput")` etc.).

## Before you write: access + confirmation

- A **personal API key acts as the user and has full read + write** to everything they can reach in the app. (OAuth tokens instead need the `write` scope; `Application`/actor tokens need the relevant scope like `issues:create`.) A read-only key returns an authentication error on any mutation.
- **Mutations change real data and notify people** (assignees, subscribers, synced Slack threads). Treat create/update as outward-facing: confirm the intent and the exact target (team, assignee, state) before firing. **Never** run a destructive mutation (`issueDelete`, `issueArchive`) or a bulk update without explicit user confirmation.

## Resolve IDs first (mutations take UUIDs, not names)

Every write takes UUIDs. Gather them with read queries (see [queries.md](queries.md) "Orientation"):

```graphql
{ teams { nodes { id key name } } }                                  # → teamId
{ viewer { id } }                                                    # → assigneeId (yourself)
{ users(first:250){ nodes { id name email } } }                      # → assigneeId (anyone)
{ team(id:"<TEAM_UUID>"){ states { nodes { id name type } } } }      # → stateId (pick by type)
{ team(id:"<TEAM_UUID>"){ labels(first:250){ nodes { id name parent { name } } } } }  # → labelIds
```

Pick `stateId` by the stable `type` (`backlog`/`unstarted`/`started`/`completed`/`canceled`), not the workspace-customizable `name`. If you omit `stateId` on create, the issue lands in the team's default state.

## The helper runs mutations too

`scripts/linear-query.sh -f op.graphql -v "$(cat vars.json)"`. It inspects the `errors` array and exits non-zero on failure — but a mutation can return HTTP 200 with `"success": false`, so **also select and check `data.<op>.success`**.

## Create an issue — verified (ran end-to-end)

```graphql
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { identifier url title state { name } assignee { name } labels { nodes { name } } }
  }
}
```

`IssueCreateInput` — only `teamId` is required; supply a `title` in practice. Commonly used fields:

| Field | Notes |
| --- | --- |
| `teamId` | **Required.** UUID of the team. |
| `title` | Plain string. |
| `description` | Markdown body. |
| `assigneeId` | User UUID. |
| `stateId` | Workflow-state UUID; omit → team default state. |
| `labelIds` | Array of label UUIDs (see exclusivity gotcha below). |
| `priority` | Int: `0` None · `1` Urgent · `2` High · `3` Medium · `4` Low. |
| `parentId` | Make it a sub-issue of another issue. |
| `projectId`, `cycleId`, `dueDate`, `subscriberIds` | As needed. |

Full field list: `scripts/linear-query.sh '{ __type(name:"IssueCreateInput"){ inputFields { name } } }'`.

### Long Markdown descriptions: build vars with `jq --rawfile`

Passing a multi-line Markdown body (backticks, brackets, newlines) as an inline JSON string is error-prone. Write the body to a file and let `jq` encode it:

```bash
jq -cn \
  --arg teamId    "<TEAM_UUID>" \
  --arg title     "My issue title" \
  --rawfile description body.md \
  --arg assigneeId "<USER_UUID>" \
  --arg stateId   "<STATE_UUID>" \
  --argjson labelIds '["<LABEL_UUID>","<LABEL_UUID>"]' \
  '{input:{teamId:$teamId,title:$title,description:$description,assigneeId:$assigneeId,stateId:$stateId,labelIds:$labelIds}}' \
  > vars.json
scripts/linear-query.sh -f issue-create.graphql -v "$(cat vars.json)"
```

`--rawfile` reads the file verbatim and JSON-encodes it; `--argjson labelIds '[…]'` injects a real array. Drop any field you don't need (e.g. omit `stateId`/`labelIds`).

### Label groups are EXCLUSIVE (verified gotcha)

If two labels share a parent group, applying both in one issue fails:

```
"The label 'Agent Harness' is in the same group as 'Infrastructure'.
 Only one label in a group can be applied to an issue."
```
(`extensions.code: INPUT_ERROR`, message `labelIds not exclusive child labels`.)

Pick **one** label per group. Labels in *different* groups, or ungrouped ones (`parent: null`), combine freely — so fetch `parent { name }` when you list labels and group accordingly before building `labelIds`.

## Update an issue — assign, move, retitle, (un)label

`issueUpdate(id:, input:)` — `id` accepts the identifier (`ADA-117`) or UUID. `IssueUpdateInput` shares most fields with create, **plus** `addedLabelIds` / `removedLabelIds`.

```graphql
mutation IssueUpdate($id:String!, $input: IssueUpdateInput!) {
  issueUpdate(id:$id, input:$input) {
    success
    issue { identifier state { name } assignee { name } labels { nodes { name } } }
  }
}
```

Common ops (the `input` object):

| Goal | `input` |
| --- | --- |
| Reassign | `{ "assigneeId": "<USER_UUID>" }` |
| Move state | `{ "stateId": "<STATE_UUID>" }` |
| Set priority | `{ "priority": 2 }` |
| Add a label without clobbering | `{ "addedLabelIds": ["<LABEL_UUID>"] }` |
| Remove a label | `{ "removedLabelIds": ["<LABEL_UUID>"] }` |
| Retitle / edit body | `{ "title": "…" }` / `{ "description": "…" }` |
| Soft-delete (to trash) | `{ "trashed": true }` |

> ⚠️ **`labelIds` REPLACES the entire label set.** To change labels without wiping the others, use `addedLabelIds` / `removedLabelIds`.

## Comment on an issue

`commentCreate(input:)` — `issueId` (UUID) + `body` (Markdown). For long bodies use the same `jq --rawfile` trick.

```graphql
mutation CommentCreate($input: CommentCreateInput!) {
  commentCreate(input: $input) { success comment { id url body createdAt } }
}
```
Variables: `{"input":{"issueId":"<ISSUE_UUID>","body":"LGTM 🚀"}}`. `issueId` wants the UUID — if you only have `ADA-117`, resolve it first: `issue(id:"ADA-117"){ id }`.

## Destructive ops — confirm first

| Mutation | Effect |
| --- | --- |
| `issueArchive(id:)` | Archive. Reversible via `issueUnarchive(id:)`. |
| `issueDelete(id:)` | **Permanent delete.** Never run without explicit confirmation. |
| `issueBatchUpdate(ids:, input:)` | Update many issues at once. Confirm the scope first. |

## Return-payload pattern

Every mutation payload exposes `success` plus the affected object (`issue` / `comment` / …). Always select `success`, check it, **and** check the top-level `errors` array (the helper exits non-zero when `errors` is present or HTTP ≥ 400).

## Introspect any input type

```bash
scripts/linear-query.sh '{ __type(name:"IssueCreateInput"){ inputFields { name } } }'
scripts/linear-query.sh '{ __type(name:"IssueUpdateInput"){ inputFields { name } } }'
scripts/linear-query.sh '{ __type(name:"CommentCreateInput"){ inputFields { name } } }'
```
