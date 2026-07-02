# Effect Hot-Path Deep Links

> Pinned to `effect@4.x` (the `effect-smol` line). Regenerate when the vendor submodule bumps. All paths relative to repo root. Line numbers point at the symbol's `export` declaration in the v4 source.

## Core — Effect

| Symbol | Path | Line |
|---|---|---|
| `Effect.gen` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L1405 |
| `Effect.fn` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L13629 |
| `Effect.fnUntraced` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L13510 |
| `Effect.succeed` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L973 |
| `Effect.fail` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L1478 |
| `Effect.sync` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L1141 |
| `Effect.promise` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L869 |
| `Effect.tryPromise` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L943 |
| `Effect.all` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L514 |
| `Effect.forEach` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L773 |
| `Effect.acquireRelease` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L6492 |
| `Effect.scoped` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L6379 |
| `Effect.catchTag` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L2697 |
| `Effect.catchTags` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L2793 |
| `Effect.catch` (v3 `catchAll`) | `vendor/effect-smol/packages/effect/src/Effect.ts` | L2614 (exported as `catch` at L2650) |
| `Effect.catchCause` (v3 `catchAllCause`) | `vendor/effect-smol/packages/effect/src/Effect.ts` | L3194 |
| `Effect.flatMap` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L1952 |
| `Effect.map` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L2350 |
| `Effect.tap` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L2129 |
| `Effect.provide` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L5856 |
| `Effect.withSpan` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L8285 |
| `Effect.orDie` | `vendor/effect-smol/packages/effect/src/Effect.ts` | L3616 |

> v4 service primitive: there is no `Effect.Service`. Define services with `Context.Service` (see the Context table below).

## Schema

| Symbol | Path | Line |
|---|---|---|
| `Schema.Struct` | `vendor/effect-smol/packages/effect/src/Schema.ts` | L3252 |
| `Schema.Class` | `vendor/effect-smol/packages/effect/src/Schema.ts` | L12477 |
| `Schema.TaggedClass` | `vendor/effect-smol/packages/effect/src/Schema.ts` | L12537 |
| `Schema.TaggedErrorClass` (v3 `TaggedError`) | `vendor/effect-smol/packages/effect/src/Schema.ts` | L12653 |
| `Schema.decodeEffect` | `vendor/effect-smol/packages/effect/src/Schema.ts` | L1230 |
| `Schema.encodeEffect` | `vendor/effect-smol/packages/effect/src/Schema.ts` | L1690 |

> v4 split the `decode`/`encode` surface by output channel: `decodeEffect`/`decodeUnknownOption`/`decodeResult`/`decodeSync` (and the `encode*` mirrors) replace v3's single `decodeUnknown`/`encodeUnknown`. Pick the variant for the channel you need.

## Layer

| Symbol | Path | Line |
|---|---|---|
| `Layer.effect` (v3 `scoped` + `effect`) | `vendor/effect-smol/packages/effect/src/Layer.ts` | L974 |
| `Layer.effectDiscard` (v3 `scopedDiscard`) | `vendor/effect-smol/packages/effect/src/Layer.ts` | L1061 |
| `Layer.succeed` | `vendor/effect-smol/packages/effect/src/Layer.ts` | L775 |
| `Layer.merge` | `vendor/effect-smol/packages/effect/src/Layer.ts` | L1245 |
| `Layer.mergeAll` | `vendor/effect-smol/packages/effect/src/Layer.ts` | L1194 |
| `Layer.provide` | `vendor/effect-smol/packages/effect/src/Layer.ts` | L1375 |
| `Layer.provideMerge` | `vendor/effect-smol/packages/effect/src/Layer.ts` | L1490 |

> `Layer.scoped` is gone in v4. `Layer.effect` now runs its construction effect inside the layer's managed `Scope`, so `Effect.addFinalizer` / `acquireRelease` work directly inside it — there is no separate scoped constructor to choose.

## Context

| Symbol | Path | Line |
|---|---|---|
| `Context.Service` (v3 `Tag` / `GenericTag` / `Effect.Tag` / `Effect.Service`) | `vendor/effect-smol/packages/effect/src/Context.ts` | L200 |

## Stream

| Symbol | Path | Line |
|---|---|---|
| `Stream.fromIterable` | `vendor/effect-smol/packages/effect/src/Stream.ts` | L1102 |
| `Stream.fromArray` (v3 `fromChunk`) | `vendor/effect-smol/packages/effect/src/Stream.ts` | L1203 |
| `Stream.mapEffect` | `vendor/effect-smol/packages/effect/src/Stream.ts` | L2020 |
| `Stream.runCollect` | `vendor/effect-smol/packages/effect/src/Stream.ts` | L10618 |
| `Stream.runDrain` | `vendor/effect-smol/packages/effect/src/Stream.ts` | L11005 |
| `Stream.runForEach` | `vendor/effect-smol/packages/effect/src/Stream.ts` | L10866 |

## HttpApi (`effect/unstable/httpapi`)

| Symbol | Path | Line |
|---|---|---|
| `HttpApi.make` | `vendor/effect-smol/packages/effect/src/unstable/httpapi/HttpApi.ts` | L206 |
| `HttpApiGroup.make` | `vendor/effect-smol/packages/effect/src/unstable/httpapi/HttpApiGroup.ts` | L373 |
| `HttpApiEndpoint.get` | `vendor/effect-smol/packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts` | L1493 |
| `HttpApiBuilder.group` | `vendor/effect-smol/packages/effect/src/unstable/httpapi/HttpApiBuilder.ts` | L118 |

## Runtime / Cache / Schedule

| Symbol | Path | Line |
|---|---|---|
| `ManagedRuntime.make` | `vendor/effect-smol/packages/effect/src/ManagedRuntime.ts` | L273 |
| `Cache.make` | `vendor/effect-smol/packages/effect/src/Cache.ts` | L271 |
| `Schedule.recurs` | `vendor/effect-smol/packages/effect/src/Schedule.ts` | L2491 |
| `Schedule.forever` | `vendor/effect-smol/packages/effect/src/Schedule.ts` | L3363 |

## Test (`@effect/vitest`)

| Symbol | Path | Line |
|---|---|---|
| `it.effect` | `vendor/effect-smol/packages/vitest/src/index.ts` | L169 |
| `it.live` | `vendor/effect-smol/packages/vitest/src/index.ts` | L174 |

> v4 vitest removed `it.scoped`: both `it.effect` and `it.live` already provide a `Scope` (their tester type is `Tester<Scope.Scope>`), so scoped resources work under `it.effect` directly.

---

## How to use

Before writing any non-trivial Effect code, jump to the line for the API you're using. Don't guess from memory — these are the contracts.

These line numbers only resolve once the vendor submodule is checked out, and they drift on every release. If `vendor/effect-smol` is empty (a fresh clone leaves it uninitialized), run `git submodule update --init vendor/effect-smol` first. Before relying on a citation here or in `anti-patterns.md`, spot-check a few entries (for example `Effect.fn`, `Schema.TaggedErrorClass`, `Layer.effect`); if any has drifted, regenerate per "How to regenerate" below rather than trusting the stale number.

## How to regenerate

When `vendor/effect-smol` is bumped, re-run the grep protocol from `SKILL.md` against the new tree, then refresh the line numbers above. Cross-check `vendor/effect-smol/migration/` for any new renames or moved modules.
