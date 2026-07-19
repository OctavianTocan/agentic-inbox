# Module layout (agentic-inbox)

## Package split

| Package | Owns |
|---------|------|
| `packages/api-core` | Wire schemas, errors, HttpApi groups (`Domain` / `Errors` / `Api` / `Events`) |
| `apps/api` | Handlers, Services, Repos, Layers, Infra |
| `apps/web` | UI + thin clients (`lib/inbox`, `lib/chat`) |

## Per-module files (api-core)

- `Domain.ts` — Schema.Class / Literals / branded ids
- `Errors.ts` — `TaggedErrorClass` + `httpApiStatus`
- `Api.ts` — `HttpApiGroup` endpoints
- Optional: `Events.ts`, `Inbox.ts`

## Per-module files (apps/api)

- `Http.ts` — `HttpApiBuilder.group` handlers
- `Service.ts` — orchestration `Context.Service`
- `Repo.ts` — persistence `Context.Service`
- Agent: `Model.ts`, `Toolkit.ts`, `Prompts.ts`

## Sub-modules

Second aggregate → nested folder on **both** sides:

- `apps/api/.../Triage/Decisions/`, `Triage/Runs/`
- `packages/api-core/.../Triage/Runs/Domain.ts`

Prefer that over a second flat `Repo.ts` at the parent. Keep HTTP groups at the parent unless independently exposed. Intent routes (`run triage`), not CRUD on internal rows.

## Anchors

`packages/api-core/src/Api.ts`, `apps/api/src/Modules/Layers.ts`, OCR `rules/api-core.md` / `api.md`.
