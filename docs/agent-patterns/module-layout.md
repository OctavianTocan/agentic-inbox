---
type: Agent Pattern
title: Module Layout
description: Architectural separation between packages/api-core, apps/api, and apps/web with file organization conventions.
tags: [architecture, module-layout, packages, structure]
timestamp: 2026-07-21T22:07:26Z
---

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

Prefer that over a second flat `Repo.ts` at the parent. Keep HTTP groups at the parent unless independently exposed. Intent routes (`run triage`, resume by attempt id), not CRUD on internal rows.

Ownership of InboxOrchestrator / TriageAgent / LedgerService: [triage-ownership-seams.md](./triage-ownership-seams.md).

## Anchors

`packages/api-core/src/Api.ts`, `apps/api/src/Modules/Layers.ts`, OCR `rules/api-core.md` / `api.md`.
