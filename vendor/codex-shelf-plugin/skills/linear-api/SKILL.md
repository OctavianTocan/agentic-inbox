---
name: linear-api
description: Read or write Linear issues via the Linear GraphQL API. Query the viewer, teams, and issues (fetch by identifier like ADA-117 or UUID; list, filter, full-text search, paginate) and create / update / assign / label / comment on issues via mutations. Use when the user mentions Linear, a Linear issue/ticket, an identifier like ABC-123, "my Linear issues", or wants to look up, list, search, check the status of, create, file, update, assign, move, re-label, or comment on issues in Linear. Auth via the LINEAR_API_KEY environment variable.
metadata:
  tavi_toolbelt_original_frontmatter:
    stages:
    - plan
---

# Linear API (read + write)

Work with Linear issues through the Linear GraphQL API (`https://api.linear.app/graphql`). **Reads** query the authenticated viewer, teams, and issues, and list/filter/search/paginate. **Writes** (mutations) create, update, assign, re-label, and comment on issues. Same endpoint, same `LINEAR_API_KEY`, and same helper script for both.

## When to Use

- The user mentions Linear, a Linear ticket, or an identifier like `ADA-117` / `ABC-123`.
- **Read:** "What are my Linear issues?", "show open issues for team X", "what's the status of ABC-123", "search Linear for …".
- **Write:** "file/create an issue", "open a ticket for …", "assign ABC-123 to me", "move it to In Progress", "add the Bug label", "comment on ABC-123".

## Setup & Auth

1. The user creates a **personal API key** at <https://linear.app/settings/account/security>. A personal key acts as the user and has full **read + write** access to everything they can reach in the app. (A read-only key, or an OAuth token lacking the `write` scope, errors on mutations.)
2. Expose it as an environment variable — **never hardcode it** in a file or commit it:
   ```bash
   export LINEAR_API_KEY=lin_api_xxxxxxxx
   ```
3. Personal API keys go in the `Authorization` header **raw** — NOT `Bearer`:
   ```
   Authorization: <LINEAR_API_KEY>
   ```
   (OAuth access tokens, by contrast, use `Authorization: Bearer <token>`.)

## Run a query or mutation

Use the bundled helper, which reads `LINEAR_API_KEY`, posts the operation, pretty-prints JSON, and fails on GraphQL/HTTP errors:

```bash
# inline query
scripts/linear-query.sh '{ viewer { name email } }'

# query/mutation file + variables
scripts/linear-query.sh -f op.graphql -v '{"n":10}'

# from stdin
echo '{ teams { nodes { id key name } } }' | scripts/linear-query.sh -
```

Plain curl equivalent (no helper):
```bash
curl -sS -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  --data '{"query":"{ viewer { id name } }"}'
```

## Core queries (verified)

**Who am I + my teams** — teams are the parent of issues; grab the `key` (e.g. `ADA`) and `id` (UUID):
```graphql
{ viewer { id name email } }
{ teams { nodes { id key name } } }
```

**Fetch one issue** by human identifier (`ADA-117`) OR UUID — `issue(id:)` accepts both:
```graphql
query($id:String!){ issue(id:$id){
  identifier title description url priorityLabel
  state { name type } assignee { name } team { key name }
  labels { nodes { name } }
  comments { nodes { body user { name } createdAt } }
} }
```

**List recent issues** (always paginate + order by `updatedAt`; see [references/issue-fields.md](references/issue-fields.md)):
```graphql
query($n:Int){ issues(first:$n, orderBy:updatedAt){
  pageInfo { hasNextPage endCursor }
  nodes { identifier title state { name type } assignee { name } team { key } priorityLabel updatedAt url }
} }
```

**My open issues**:
```graphql
{ viewer { assignedIssues(first:20, filter:{ state:{ type:{ nin:["completed","canceled"] } } }){
  nodes { identifier title state { name } } } } }
```

**Filter** (team + status) and **full-text search**:
```graphql
{ issues(first:20, filter:{ team:{ key:{ eq:"ADA" } }, state:{ type:{ eq:"started" } } }){
  nodes { identifier title state { name } } } }

{ searchIssues(term:"github", first:10){ nodes { identifier title url } } }
```

The full catalog (by-assignee, by-label, by-priority, by-project, date ranges, cursor pagination, archived) is in **[references/queries.md](references/queries.md)**. Issue fields, the `state.type` enum, filter operators, and pagination details are in **[references/issue-fields.md](references/issue-fields.md)**.

## Mutations: create / update / comment

Writes use the same helper — send a `mutation { … }` with `$input` variables. **Resolve UUIDs first** (team, assignee, state, labels); mutations take IDs, not names. Minimal create:

```graphql
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { identifier url } }
}
```
with variables `{"input":{"teamId":"<TEAM_UUID>","title":"…","assigneeId":"<USER_UUID>"}}`.

Two things that bite: **label groups are exclusive** (only one label per parent group, else `INPUT_ERROR: labelIds not exclusive child labels`), and on update **`labelIds` REPLACES** the whole set — use `addedLabelIds`/`removedLabelIds` to change labels incrementally. For long Markdown bodies, build the variables with `jq --rawfile` to avoid shell-escaping.

The full mutation catalog — create (with the `jq --rawfile` pattern), update/assign/move/label, comment, destructive ops, and return-payload handling — is in **[references/mutations.md](references/mutations.md)**.

**Mutations change real data and notify people.** Confirm the target (team, assignee, state) before creating, and never run a destructive (`issueDelete`/`issueArchive`) or bulk mutation without explicit user confirmation.

## Gotchas

- **Check for `errors` even on HTTP 200.** GraphQL can return `200` with a top-level `errors` array (partial success). The helper script exits non-zero when that happens; with raw curl, always inspect `errors` before trusting `data`. Mutations can also return `200` with `"success": false` — select and check `success` too.
- **`state.type`** is the stable enum for status category — `triage`, `backlog`, `unstarted`, `started`, `completed`, `canceled`. Filter on `type` (stable) rather than `name` (workspace-customizable).
- **Identifiers vs UUIDs.** `ADA-117` (human) and the UUID both work for `issue(id:)` and `issueUpdate(id:)`. Lists/filters return both `identifier` and `id`.
- **Pagination is required for completeness.** Default page size is limited; follow `pageInfo.endCursor` with `after:` until `hasNextPage` is false. Don't fetch everything if a filter will do — filter server-side.
- **Archived issues are hidden** unless you pass `includeArchived: true`.
- **Mutations take UUIDs, not names** — resolve `teamId`/`assigneeId`/`stateId`/`labelIds` with read queries first. **Label groups are exclusive** (one label per parent group). On `issueUpdate`, `labelIds` replaces all labels — prefer `addedLabelIds`/`removedLabelIds`.
- **Rate limits & realtime.** Don't poll per-issue; order by `updatedAt` and page recent changes, or use webhooks. Throttling returns `extensions.code: "RATELIMITED"`; limits cover both request count and query **complexity** (watch the `X-Complexity` / `X-RateLimit-*` response headers). See <https://linear.app/developers/rate-limiting>.

## Security

The API key is a secret. Keep it in `LINEAR_API_KEY` (env / a secrets manager), never in the repo, a query file, or output. If a key is ever shared in plaintext, rotate it at the Security & access settings page.

## References

- [references/queries.md](references/queries.md) — copy-ready issue queries (lookup, list, filter, search, paginate, archived).
- [references/issue-fields.md](references/issue-fields.md) — Issue fields, nested objects, the `state.type` enum, filter operators, pagination, error handling.
- [references/mutations.md](references/mutations.md) — create / update / assign / label / comment mutations, the `jq --rawfile` pattern for long Markdown, label-group exclusivity, destructive-op safety, return-payload handling.
- [scripts/linear-query.sh](scripts/linear-query.sh) — the query/mutation runner.
- Linear API docs: <https://linear.app/developers/graphql> · filtering <https://linear.app/developers/filtering> · pagination <https://linear.app/developers/pagination> · rate limiting <https://linear.app/developers/rate-limiting>
- Typed alternative: the official `@linear/sdk` (<https://linear.app/developers/sdk>) — see the "TypeScript SDK alternative" section in [references/queries.md](references/queries.md).
