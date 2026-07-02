# API Module Example (Notes)

Demonstrates the canonical API module archetype: a shared **contract** package plus the implementing **server** app.

## Two-Package Split

API modules span two layers. HTTP+RPC modules expose a public HTTP surface; RPC-only modules are internal.

| Layer | HTTP+RPC files | RPC-only files | Purpose |
|-------|---------------|---------------|---------|
| `contract/Modules/<Name>/` | Domain.ts, Errors.ts, Api.ts, RpcProtocol.ts | Domain.ts, Errors.ts, RpcProtocol.ts | Shared contracts |
| `server/Modules/<Name>/` | Repo.ts, Service.ts, Policy.ts, Http.ts, Rpc.ts | Repo.ts, Service.ts, Rpc.ts, Constants.ts | Implementation |

## Complexity Archetypes

| Archetype | Complexity | Notable Patterns |
|-----------|-----------|-----------------|
| Simple CRUD | Low | Repo + Service + Policy, scoped lifecycle |
| HTTP + RPC | Medium | RPC handlers, env assembly helpers |
| RPC-only | Medium | Omits `Api.ts`/`Http.ts`/`Policy.ts`; RPC via `RpcProtocol.ts` + `Rpc.ts` |
| Background jobs | Medium | Task/workflow definitions in `Tasks/` subdirectory |

## File Layout

HTTP+RPC module (Notes — the example in this directory):

```
Notes/
  Domain.ts         Branded types, Schema classes (NoteCreateInput, NoteUpdateInput)
  Errors.ts         TaggedError definitions (NoteNotFoundError, NoteTitleConflictError)
  Api.ts            HttpApiGroup + endpoint definitions (uses NoteCreateInput as payload)
  RpcProtocol.ts    RPC group definition (shared contract for M2M)
  Repo.ts           Data access (Effect SQL) + NoteRow, NoteInsert, NoteUpdate types
  Service.ts        Business logic (accepts NoteCreateInput/NoteUpdateInput)
  Policy.ts         Authorization rules (scope-based)
  Http.ts           HTTP handler implementations (wires Service + Policy)
  Rpc.ts            RPC handler implementations
```

RPC-only modules omit `Api.ts`, `Http.ts`, and `Policy.ts`.

## Key Patterns

- **Entity-first naming**: `NoteCreateInput`, `NoteUpdateInput`, `NoteNotFoundError`.
- **Input types (Schema.Class)**: Used by both API endpoints (`setPayload`) and service methods. No separate Params vs Input in API modules.
- **Repo types in Repo.ts**: `NoteRow`, `NoteInsert`, `NoteUpdate` describe the `note` table shape.
- **Inline delete**: `delete` defined inline in return object (avoids JS reserved word issue).
- **Effectful timestamps**: `yield* DateTime.now` instead of `new Date()`.
- **Partial updates**: `stripUndefined` from `@core/effect/Helpers`.
- **Uniqueness via DB constraint**: `catchDbViolation` only — no pre-check queries.
- **RPC**: Modules consumed by other services define `RpcProtocol.ts` in the contract package and `Rpc.ts` in the server app.
