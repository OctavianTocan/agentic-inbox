# Linear Issue Query Catalog

Copy-ready, **verified** read-only GraphQL queries for Linear issues. Run any of them with `scripts/linear-query.sh '<query>'` (or `-f file.graphql -v '{...}'`). All require `LINEAR_API_KEY` in the environment. Endpoint: `https://api.linear.app/graphql`.

## Orientation

```graphql
# Authenticated user
{ viewer { id name email } }

# Teams (issues are team-scoped). Grab `key` (e.g. "ADA") and `id` (UUID).
{ teams { nodes { id key name } } }

# A team's workflow states (status options). Filter by team in real use.
{ workflowStates(first:50) { nodes { id name type team { key } } } }

# Users (for assignee lookups)
{ users(first:50) { nodes { id name email } } }
```

## Fetch a single issue

`issue(id:)` accepts the human identifier (`ADA-117`) OR the UUID.

```graphql
query($id:String!){
  issue(id:$id){
    id identifier title description url
    priority priorityLabel
    state { id name type }
    assignee { id name email }
    creator { name }
    team { id key name }
    project { id name }
    labels { nodes { id name color } }
    parent { identifier title }
    children { nodes { identifier title } }
    comments { nodes { body user { name } createdAt } }
    createdAt updatedAt completedAt archivedAt
  }
}
```
Variables: `{"id":"ADA-117"}`.

## List issues (always paginate)

```graphql
query($n:Int, $after:String){
  issues(first:$n, after:$after, orderBy:updatedAt){
    pageInfo { hasNextPage endCursor }
    nodes {
      identifier title
      state { name type }
      assignee { name }
      team { key }
      priorityLabel
      updatedAt url
    }
  }
}
```
- First page: `{"n":50}`. Next page: `{"n":50,"after":"<endCursor from previous page>"}`.
- `orderBy` is `updatedAt` or `createdAt`. Recently-updated-first is the right default for polling.

## "My" issues

```graphql
# Assigned to me, excluding done/canceled
{ viewer { assignedIssues(first:25, filter:{ state:{ type:{ nin:["completed","canceled"] } } }){
    nodes { identifier title state { name type } updatedAt } } } }

# Created by me
{ viewer { createdIssues(first:25){ nodes { identifier title state { name } } } } }
```

## Filtering (server-side — preferred)

Filters compose; multiple keys are AND by default. Use `or:`/`and:` for boolean groups.

```graphql
# By team key + status category
{ issues(first:25, filter:{ team:{ key:{ eq:"ADA" } }, state:{ type:{ eq:"started" } } }){
    nodes { identifier title state { name } } } }

# By assignee email
{ issues(first:25, filter:{ assignee:{ email:{ eq:"someone@example.com" } } }){
    nodes { identifier title } } }

# By label name — a bare label filter matches when SOME label matches
{ issues(first:25, filter:{ labels:{ name:{ eq:"Feature" } } }){ nodes { identifier title } } }

# Collection-relation operators on labels: `every` (ALL labels match) and `length` (e.g. no labels)
{ issues(first:25, filter:{ labels:{ every:{ name:{ eq:"Feature" } } } }){ nodes { identifier } } }
{ issues(first:25, filter:{ labels:{ length:{ eq:0 } } }){ nodes { identifier } } }

# By priority (0 None · 1 Urgent · 2 High · 3 Medium · 4 Low)
{ issues(first:25, filter:{ priority:{ eq:2 } }){ nodes { identifier priorityLabel title } } }

# Comparator combo: "has a priority, at least High" (urgent or high; excludes None)
{ issues(first:25, filter:{ priority:{ lte:2, neq:0 } }){ nodes { identifier priorityLabel } } }

# By project
{ issues(first:25, filter:{ project:{ name:{ eq:"My Project" } } }){ nodes { identifier title } } }

# Date range (ISO date or datetime)
{ issues(first:25, filter:{ createdAt:{ gte:"2026-05-01" }, updatedAt:{ lte:"2026-06-01" } }){
    nodes { identifier createdAt } } }

# Boolean OR group (urgent OR high)
{ issues(first:25, filter:{ or:[ { priority:{ eq:1 } }, { priority:{ eq:2 } } ] }){
    nodes { identifier priorityLabel } } }

# Text contains (case-insensitive) on a field
{ issues(first:25, filter:{ title:{ containsIgnoreCase:"github" } }){ nodes { identifier title } } }
```

## Full-text search

```graphql
{ searchIssues(term:"github merge queue", first:10){
    nodes { identifier title url state { name } } } }
```
`searchIssues` ranks by relevance across title/description; use it for free-text, use `filter` for structured queries.

## Scoped lists (nested)

```graphql
# Issues within one team
{ team(id:"<TEAM_UUID>"){ key issues(first:25, orderBy:updatedAt){ nodes { identifier title } } } }

# Issues assigned to one user
{ user(id:"<USER_UUID>"){ name assignedIssues(first:25){ nodes { identifier title } } } }

# Issues in one workflow state
{ workflowState(id:"<STATE_UUID>"){ name issues(first:25){ nodes { identifier title } } } }
```

## Archived issues

Hidden by default. Include them with `includeArchived: true`:

```graphql
{ issues(first:25, includeArchived:true){ nodes { identifier title archivedAt } } }
```

## TypeScript SDK alternative

For ad-hoc reads, raw GraphQL + `scripts/linear-query.sh` is simplest. For a typed program, the official [`@linear/sdk`](https://linear.app/developers/sdk) wraps the same schema:

```ts
import { LinearClient } from "@linear/sdk";
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

// list with filter + pagination
const issues = await linear.issues({ first: 20, filter: { state: { type: { eq: "started" } } } });
console.log(issues.nodes.map((i) => i.identifier));

// one issue by identifier or UUID
const issue = await linear.issue("ADA-117");

// the viewer's assigned issues
const me = await linear.viewer;
const mine = await me.assignedIssues({ first: 25 });
```

Connections expose `.nodes`, `.pageInfo`, and pagination helpers (`fetchNext()` / `fetchPrevious()`). Same auth model — `apiKey` is your `LINEAR_API_KEY`.

## Notes

- Combine filters with pagination: `issues(first:50, after:$cursor, filter:{...}, orderBy:updatedAt)`.
- Prefer filtering server-side over fetching everything and filtering in code.
- `state.type` (stable enum) is safer to filter on than `state.name` (workspace-customizable). See [issue-fields.md](issue-fields.md).
