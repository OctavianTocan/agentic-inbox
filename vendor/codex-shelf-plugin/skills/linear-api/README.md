# linear-api

> A read-only skill for AI agents to query the **Linear GraphQL API** — look at issues: fetch by identifier, list, filter, search, and paginate.

---

## What It Does

`linear-api` teaches an agent how to query Linear's GraphQL API for issue data. It covers authentication (personal API key via `LINEAR_API_KEY`), a query-runner script, and a catalog of verified, copy-ready queries: the authenticated viewer, teams, a single issue by identifier (`ADA-117`) or UUID, lists/filters by team/assignee/state/label/priority, full-text search, and cursor pagination. **Read-only** — no mutations.

Every query in the skill was verified against the live Linear API.

## Skill Architecture

```
linear-api/
├── SKILL.md                      # routing + core how-to (auth, runner, key queries, gotchas)
├── scripts/
│   └── linear-query.sh           # run a GraphQL query (reads LINEAR_API_KEY; jq pretty-print)
└── references/
    ├── queries.md                # full verified query catalog
    └── issue-fields.md           # Issue fields, state.type enum, filter operators, pagination, errors
```

## Setup

1. Create a **personal API key**: <https://linear.app/settings/account/security>.
2. Export it (never hardcode or commit it):
   ```bash
   export LINEAR_API_KEY=lin_api_xxxxxxxx
   ```
   Personal keys go in the `Authorization` header **raw** (no `Bearer`).

## Usage

```bash
# who am I
scripts/linear-query.sh '{ viewer { name email } }'

# my open issues
scripts/linear-query.sh '{ viewer { assignedIssues(first:20, filter:{ state:{ type:{ nin:["completed","canceled"] } } }){ nodes { identifier title state { name } } } } }'

# one issue by identifier
scripts/linear-query.sh -f issue.graphql -v '{"id":"ADA-117"}'
```

Ask an agent naturally — "show my open Linear issues", "what's the status of ADA-117", "search Linear for github" — and it will pick the right query from the catalog.

## Installation

Install with Vercel's Skills CLI (recommended):

```bash
npx skills add OctavianTocan/linear-api
```

Or copy the directory into your agent's skills folder:

```bash
cp -r linear-api ~/.claude/skills/       # Claude Code (personal)
cp -r linear-api ~/.agents/skills/       # all local agents
```

## Scope

Read-only issue viewing (v1). It does not create or edit issues, manage comments, or handle webhooks. The query runner is generic GraphQL, so it can read other Linear entities too, but the documented recipes focus on issues.

## License

MIT
