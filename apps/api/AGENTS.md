# apps/api — AGENTS.md

Delta for the Effect backend. Root / brain `AGENTS.md` may be local-only; this file is committed.

## Vendored repositories

This monorepo vendors Effect under `repos/` (git subtree). See [`repos/README.md`](../../repos/README.md).

- Use `repos/` as **read-only** reference when writing Effect code.
- Prefer vendored source and [`docs/agent-patterns/`](../../docs/agent-patterns/) over web search or `node_modules`.
- **Do not edit** `repos/` unless asked. **Do not import** from `repos/` — use catalog `effect` / `@effect/*`.
- Before writing Effect code, read [`repos/effect-smol/LLMS.md`](../../repos/effect-smol/LLMS.md).
- Index of distillations: [`docs/agent-patterns/README.md`](../../docs/agent-patterns/README.md) (layers, modules, repos, agent loop, demo, OCR, …).

## Triage ownership seams

Vocabulary: root [`GLOSSARY.md`](../../GLOSSARY.md). Full table: [`docs/agent-patterns/triage-ownership-seams.md`](../../docs/agent-patterns/triage-ownership-seams.md).

Hard rules:

1. Only InboxOrchestrator mints `attemptId` / `threadId` (ledger wire field may still say `runId`).
2. Only LedgerService appends `action_ledger`.
3. Only InboxOrchestrator writes Attempt rows and Classifications from agent outcomes.
4. Triage resume key is `attemptId`; pause payload on the Attempt (`interrupted` + `pending`).
5. Only InboxOrchestrator emits triage SSE.
6. TriageAgent must not talk to ledger / attempt / classification repos directly.
7. ChatAgent must not define the triage resume path.

## Local commands

- `bun run --cwd apps/api typecheck`
- `bun run --cwd apps/api test` (or `bunx vitest run --project api` from repo root)
- `bun run --cwd apps/api migrate`
- `bun run --cwd apps/api dev` (standalone Bun listener on `PORT`, default 8001)
