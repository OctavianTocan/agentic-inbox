# Module layout (agentic-inbox API)

Match the existing `packages/api-core` + `apps/api` split.

## api-core (contract / schemas)

```
packages/api-core/src/Modules/{Name}/
  Domain.ts   # Schemas, records, branded types — NO tagged errors
  Errors.ts   # Tagged errors + error unions
  Api.ts      # HttpApi group for this module (when HTTP-exposed)
  {Sub}/Domain.ts   # Optional sub-module for a second aggregate
```

Root composition: `packages/api-core/src/Api.ts` wires module `Api` groups.

Examples already in-tree:

- `Modules/Triage/{Domain,Errors,Api,Events,Inbox}.ts`
- `Modules/Triage/Runs/Domain.ts` (sub-module)
- `Modules/Chat/{Domain,Errors,Api}.ts`
- `Modules/Actions/{Domain,Errors,Api}.ts`
- `Modules/Emails/{Domain,Errors}.ts`
- `Modules/System/Api.ts`

## apps/api (runtime)

```
apps/api/src/Modules/{Name}/
  Service.ts     # Effect Layer / service implementation
  Http.ts        # HTTP handlers wiring api-core groups
  Policy.ts      # Domain policy (e.g. Actions)
  Model.ts / Prompts.ts / Toolkit.ts  # AI pieces as needed (Agent)
  {Sub}/Repo.ts  # Persistence per aggregate (sub-module when >1)
```

Examples:

- `Modules/Triage/Decisions/Repo.ts`, `Modules/Triage/Runs/Repo.ts`
- `Modules/Actions/Repo.ts` (single aggregate — flat is fine)
- `Modules/Chat/Repo.ts`

App composition: `apps/api/src/App.ts`, `Modules/Layers.ts`.  
Database: `apps/api/src/Infrastructure/Database/{Migrate,Migrator}.ts`.  
Local serve: `Main.ts`.

## Repo methods

| Kind | Surface |
|------|---------|
| Mutable aggregate | `create` / `upsert`, `get` / `list*`, wipe `delete*` — **whole entity** |
| Append-only ledger | `append` + reads (+ wipe deletes) |
| Concurrency claim | Named atomic intent (e.g. `claimApproval`) only when needed |

Do **not** add per-field writers (`updateStatus`, `setPending`, `complete`, …). Services change fields, then upsert.

Public HTTP stays **intent**-shaped (`run triage`, `resume by runId`), not CRUD over internal rows.

## Rules

1. **Domain.ts** — export schemas and `Schema.Type` aliases only.
2. **Errors.ts** — all tagged errors for the module; export unions used by services/repos.
3. **Never** define tagged errors in `Service.ts`, `Http.ts`, `Repo.ts`, or tool files.
4. **Do not** duplicate api-core schemas as plain interfaces in `apps/api` — derive or import.
5. **Split** when a folder mixes unrelated domains (e.g. System vs Triage vs Chat).
6. **Sub-module** when a module needs another Domain/Repo aggregate — nest under `Module/Sub/` on both api-core and apps/api.
7. **Static emails** — read sample mail from `data/emails.json`; do not invent a live IMAP/Gmail client in this product slice.
8. **Sensitive deferral** — policy that could auto-send or commit money/legal exposure must defer to a human reviewer.

## Checklist before calling work done

- [ ] New errors in `Errors.ts`, not inline in services/repos
- [ ] New wire schemas in `packages/api-core` `Domain.ts` (or `Sub/Domain.ts`)
- [ ] Repo changes covered by package tests under `apps/api/test/`
- [ ] `bun run typecheck` (or package-scoped) + relevant tests
- [ ] If OpenAPI surface changed: `bun run openapi:generate` / `openapi:check` (when tools exist)
- [ ] No new auto-action path for sensitive mail without an explicit human gate
- [ ] No per-field repo updaters on mutable aggregates
