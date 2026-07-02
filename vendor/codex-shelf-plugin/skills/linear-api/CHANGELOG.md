# Changelog

## 1.0.0
- Initial release of `linear-api` (read-only issue viewing).
- `SKILL.md`: auth via `LINEAR_API_KEY`, query runner usage, core verified queries, gotchas, security.
- `scripts/linear-query.sh`: GraphQL query runner (env-key auth, variables, jq pretty-print, error-aware exit codes).
- `references/queries.md`: verified issue query catalog (lookup, list, filter, search, paginate, archived).
- `references/issue-fields.md`: Issue fields, `state.type` enum, filter operators, pagination, error handling.
- All queries verified against the live Linear GraphQL API.
- Cross-checked against the official Linear developer docs (via Context7): added collection-relation filter operators (`every`/`some`/`length`), the `edges{node cursor}` Relay form, concrete rate-limit headers + the `RATELIMITED` error code + query-complexity limits, and a `@linear/sdk` (TypeScript SDK) usage section.
