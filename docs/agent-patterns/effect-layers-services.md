---
type: Agent Pattern
title: Effect Layers & Services
description: Dependency injection using Context.Service tags, Layer.effect, Layer.provide, and production wiring.
tags: [effect, layers, services, dependency-injection]
timestamp: 2026-07-21T22:07:26Z
---

# Effect Layers & Context.Service (agentic-inbox)

App anchors: `Modules/*/Service.ts`, `Modules/*/Repo.ts`, `Modules/Layers.ts`, `App.ts`, `Modules/Demo/Layers.ts`.

## Service tags

- Public deps are `Context.Service` classes with a stable id string
  (`'@apps/api/Triage/TriageService'`).
- Shape is the method interface; implementation is a `Layer`, not methods on the class.

## Body vs Live

```ts
export class FooRepo extends Context.Service<FooRepo, { … }>()('…') {}
export const FooRepoBody = Layer.effect(FooRepo, Effect.gen(function* () { … }))
export const FooRepoLive = Layer.provide(FooRepoBody, DatabaseLive)
```

- `*Body`: needs `PgClient` / other deps — use in tests with fakes.
- `*Live`: production wiring (`DatabaseLive`, nested service lives).
- Services: same split (`ActionServiceBody` → `ActionServiceLive`).

## Composition

- Merge HttpApi groups in `Modules/Layers.ts` → `CoreModulesLive`.
- Provide each group its services: `HttpTriageLive.pipe(Layer.provide(TriageServiceLive))`.
- Root: `AppLive` = `HttpApiBuilder.layer(Api)` + `SchemaErrorHandlerLive` + Scalar `/docs`.
- Next: `HttpRouter.toWebHandler` + `HttpServer.layerServices` (`WebHandler.ts`).

## Avoid

- Constructing services with `new` / singletons outside Layers.
- Putting SQL or OpenRouter inside Http handler modules — yield the service tag.
