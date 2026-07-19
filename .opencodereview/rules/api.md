# Agentic Inbox — apps/api (Effect backend)

Apply **base.md** conventions plus:

Handlers, repos, agent loop, and Postgres live here. Contracts come from `@app/api-core`.

## Do NOT flag

- Module folders under `src/Modules/{Emails,Triage,Actions,Chat,Agent,System}`
- **Sub-modules** under a module when a second aggregate needs its own `Repo` / domain types (e.g. `Triage/Decisions/`, `Triage/Runs/`) — preferred over packing multiple repos into one flat `Repo.ts`
- Mutable-aggregate repos shaped as `create`/`upsert` + `get`/`list*` + `delete*` (whole-entity save; services mutate in memory then upsert)
- Append-only ledgers using `append` + reads (`Actions/Repo.ts`) instead of upsert
- Narrow atomic intents on a repo when concurrency requires it (e.g. `claimApproval`) — not general field setters
- **SQL row → domain via Effect Schema**: `Domain.pipe(Schema.encodeKeys({…}))` + `decodeSqlRow(...)` from `Infrastructure/Database/DecodeSqlRow.ts` (sync decode at the repo boundary is intentional)
- `Schema.NullOr` / `Schema.optional(Schema.NullOr(...))` on fields that map to SQL NULL columns
- `isSensitive` / `SENSITIVE_CATEGORIES` / keyword gates in `Modules/Actions/Policy.ts`
- Approval pause for `send_reply` on sensitive mail; `flag_for_review` as the no-reply fallback
- `undoAction` ledger semantics; `TEST_DATABASE_URL` as a distinct `*_test` DB
- OpenRouter via catalog-pinned `@effect/ai-openrouter` until `packages/clients/ai-sdk` exists

## DO flag

- Any path that auto-executes when `isSensitive(...)` is true (category, confidence ≤ `MIN_AUTO_CONFIDENCE`, or body keyword hit)
- Weakening or bypassing `SENSITIVE_CATEGORIES` / legal / safety / escalation keyword lists without tests that fail for the old invariant
- Agent prompts that instruct autonomous send/commit on financial, dispute, safety, or escalation mail
- Mutating ledger / decisions without plain-language rationale the UI can show
- Undo that cannot reverse an auto-action, or allowing undo-of-undo as a silent no-op without a tagged error
- HttpApi schemas/errors authored only in `apps/api` instead of `@app/api-core`
- Using `DATABASE_URL` (or truncating) the primary DB in tests — must use `TEST_DATABASE_URL`
- Credential leakage in logs, stream events, or chat tool results
- `decodeUnknownSync` / sync decode in Effect **request/service hot paths** (handlers, agent loops) — exception: repo SQL row decode via `decodeSqlRow` / `Schema.encodeKeys` as above; missing timeouts on outbound LLM calls
- **Hand-mapped SQL row decoders** — `as` casts, per-field `decodeUnknownSync` on literals only, or `new Domain({ emailId: row.email_id as … })` instead of `Schema.encodeKeys` + `decodeSqlRow`
- New AI provider wiring scattered in feature modules instead of a single agent/client boundary
- Missing regression tests for triage stream, policy gate, approval resume, or undo behavior changes
- **Repo methods that patch single fields** on a mutable aggregate (`updateStatus`, `setPending`, `complete`, `updateProposal`, …) — use whole-entity `upsert` instead; keep transitions in the service
- **Second Domain/Repo aggregate dumped flat** into the parent module when it should be a sub-module folder (`Module/Sub/{Repo.ts,…}` mirroring `api-core` `Module/Sub/Domain.ts`)
- Exposing CRUD HTTP endpoints for internal persistence rows (e.g. triage runs) instead of domain intents (`run triage`, `resume by runId`)
