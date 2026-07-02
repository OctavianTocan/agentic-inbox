# Issue Fields, Filtering & Pagination Reference

Field names and operators are verified against the live Linear API. Introspect the full schema any time:
```bash
scripts/linear-query.sh '{ __type(name:"Issue"){ fields { name } } }'
scripts/linear-query.sh '{ __type(name:"IssueFilter"){ inputFields { name } } }'
```

## Common `Issue` fields

| Field | Notes |
| --- | --- |
| `id` | UUID. |
| `identifier` | Human id like `ADA-117` (team key + number). Works in `issue(id:)`. |
| `title`, `description` | `description` is Markdown. |
| `url` | Web URL to the issue. |
| `priority` | Int: `0` None · `1` Urgent · `2` High · `3` Medium · `4` Low. |
| `priorityLabel` | String form of the above. |
| `estimate` | Number (if estimation enabled). |
| `createdAt`, `updatedAt`, `completedAt`, `canceledAt`, `startedAt`, `archivedAt`, `dueDate` | ISO 8601. `archivedAt`/`completedAt` are null when N/A. |
| `branchName` | Suggested git branch name. |

## Nested objects (select sub-fields)

| Relation | Shape | Useful sub-fields |
| --- | --- | --- |
| `state` | WorkflowState | `id name type` |
| `assignee`, `creator` | User | `id name email` |
| `team` | Team | `id key name` |
| `project` | Project | `id name state` |
| `labels` | connection | `nodes { id name color }` |
| `parent` / `children` | Issue(s) | `identifier title` |
| `comments` | connection | `nodes { body user { name } createdAt }` |
| `subscribers`, `cycle`, `attachments` | various | introspect as needed |

## `state.type` enum (status category — stable)

`triage` · `backlog` · `unstarted` · `started` · `completed` · `canceled`

Filter on `state.type` (stable across workspaces) rather than `state.name` (each workspace renames states like "Todo", "In Progress", "In Review"). Map "open" = `nin:["completed","canceled"]`.

## Filter operators (`IssueFilter`)

Filters are objects keyed by field, with a comparator inside:

- **Strings** (`title`, etc.): `eq`, `neq`, `contains`, `containsIgnoreCase`, `startsWith`, `endsWith`, `in`, `nin`, `null`.
- **IDs / enums** (`state.type`, `priority`): `eq`, `neq`, `in`, `nin`.
- **Numbers** (`priority`, `estimate`): `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`.
- **Dates** (`createdAt`, `updatedAt`, …): `eq`, `lt`, `lte`, `gt`, `gte` with ISO date/datetime strings.
- **Relations** (`team`, `assignee`, `project`, `state`): nest the related entity's filter, e.g. `team:{ key:{ eq:"ADA" } }`, `assignee:{ email:{ eq:"x@y.com" } }`.
- **Collection relations** (`labels`, `children`, …): a bare nested filter — `labels:{ name:{ eq:"Bug" } }` — matches when **some** item matches. Use `every:` to require ALL items match, `some:` to say it explicitly, and `length:` to filter by count, e.g. `labels:{ every:{ name:{ eq:"Bug" } } }` or `labels:{ length:{ eq:0 } }` (issues with no labels).
- **Boolean groups**: `and:[ {...}, {...} ]`, `or:[ {...}, {...} ]`. Top-level keys are ANDed implicitly.

Example combining several:
```graphql
issues(first:50, orderBy:updatedAt, filter:{
  team:{ key:{ eq:"ADA" } },
  state:{ type:{ in:["unstarted","started"] } },
  assignee:{ email:{ eq:"me@example.com" } },
  updatedAt:{ gte:"2026-05-01" }
})
```

## Pagination (Relay connections)

`issues` (and every `*.nodes` connection) is cursor-based:
```graphql
issues(first:50, after:$cursor, orderBy:updatedAt){
  pageInfo { hasNextPage endCursor }
  nodes { identifier }
}
```
- Pass `first` (page size) and `after: endCursor` to advance. Loop until `pageInfo.hasNextPage` is `false`.
- `nodes { ... }` is the shortcut; the full Relay form `edges { node { ... } cursor }` is also available when you need a per-item `cursor`.
- `orderBy`: `updatedAt` (default for change-polling) or `createdAt`.
- `includeArchived: true` to include archived rows (excluded by default).
- Backward paging: `last` + `before`.

## Error handling

GraphQL returns errors in an `errors` array and **can return HTTP 200 with both `data` and `errors`** (partial success). Always check `errors` before trusting `data`. Each error has `message`, `locations`/`path`, and `extensions.code` (e.g. `GRAPHQL_VALIDATION_FAILED`, authentication errors, or `RATELIMITED`). `scripts/linear-query.sh` exits non-zero whenever an `errors` array is present or the HTTP status is ≥ 400.

## Rate limits & freshness

Don't poll per-issue. To track changes, order by `updatedAt` and page the recent window, or register a webhook (`https://linear.app/developers/webhooks`).

Rate limiting has two dimensions, both surfaced via response headers:
- **Request count** — `X-RateLimit-Requests-Limit` / `-Remaining` / `-Reset` (UTC epoch ms). Some queries/mutations have tighter per-endpoint limits, reported via `X-RateLimit-Endpoint-Requests-*` and `X-RateLimit-Endpoint-Name`.
- **Query complexity** — every query costs points based on how much it requests: `X-Complexity` (this query) plus `X-RateLimit-Complexity-Limit` / `-Remaining` / `-Reset`. Request fewer fields and smaller pages to lower the cost.

When throttled, the response is a normal `errors` array with `extensions.code: "RATELIMITED"`; back off until the relevant `*-Reset` time. Full details: `https://linear.app/developers/rate-limiting`.
