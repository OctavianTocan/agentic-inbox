# Agentic Inbox — apps/api (Effect backend)

Apply **base.md** conventions plus:

Handlers, repos, agent loop, and Postgres live here. Contracts come from `@app/api-core`.

## Do NOT flag

- Module folders under `src/Modules/{Emails,Triage,Actions,Chat,Agent,System}`
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
- `decodeUnknownSync` / sync decode in Effect hot paths; missing timeouts on outbound LLM calls
- New AI provider wiring scattered in feature modules instead of a single agent/client boundary
- Missing regression tests for triage stream, policy gate, approval resume, or undo behavior changes
