# Agentic Inbox — api-core (HTTP contracts)

Apply **base.md** conventions plus:

`packages/api-core` owns wire schemas and HttpApi groups. Handlers live in `apps/api`.

## Do NOT flag

- Thin `Api.ts` composing module HttpApi groups under `/api/v1`
- Module layout `Domain.ts` / `Errors.ts` / `Api.ts` (and `Events.ts` / `Inbox.ts` where present)
- Package name `@app/api-core`; direct file imports (`@app/api-core/Modules/Triage/Domain`)

## DO flag

- Handler / repo / DB logic landing here instead of `apps/api`
- Tagged errors defined in `Domain.ts` or `Api.ts` instead of `Errors.ts`
- Duplicate request/response shapes redefined in `apps/web` or `apps/api` instead of importing from api-core
- New HTTP endpoints added only in `apps/api` without a matching api-core contract
- Wire types as plain interfaces when they should be Effect Schema (OpenAPI / decode boundary)
- Breaking field renames on Decision / Ledger / Approval payloads without updating web clients and tests in the same change
- Schemas that encode auto-execution of sensitive categories without an approval / `flag_for_review` path
