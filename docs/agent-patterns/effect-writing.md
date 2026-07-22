---
type: Agent Pattern
title: Writing Effect Code
description: Prefer Effect.gen and Effect.fn for sequential work; attach catch/span with combinators; avoid nested flatMap towers.
tags: [effect, gen, fn, flatMap, stream, style]
timestamp: 2026-07-22T13:55:00Z
---

# Writing Effect code (agentic-inbox)

Source of truth: `repos/effect-smol/LLMS.md` (“Writing Effect code”). Stream example shape: `repos/effect-smol/ai-docs/src/03_stream/20_consuming-streams.ts`.

App anchors: `Modules/*/Service.ts`, `Modules/*/Repo.ts` (methods via `Effect.fn`), batch work in `Modules/Triage/Service.ts`.

## Prefer `Effect.gen` and `Effect.fn`

- Write sequential Effect work in generator style (`yield*` ≈ `await`).
- Name functions that return an Effect with `Effect.fn("Name")` — better stack traces and a tracing span.
- Do **not** wrap a bare `() => Effect.gen(...)` when `Effect.fn` fits.
- Private helpers live inside the Layer `Effect.gen` body and stay off the `Context.Service` interface unless you deliberately return them. Reuse them from multiple public methods (e.g. batch + retriage sharing one persist path).

```ts
export const processEmail = Effect.fn('processEmail')(function* (email: Email) {
  yield* runs.create(/* … */)
  const { decision } = yield* agent.triageEmail(email)
  return yield* decisions.upsert(decision)
})
```

## Combinators after the gen

Attach `Effect.catch`, `Effect.withSpan`, `Effect.annotateLogs`, and similar with `.pipe` **on** the gen / as extra args to `Effect.fn`. Prefer that over encoding the whole flow as nested combinators.

```ts
Effect.gen(function* () {
  // sequential steps…
}).pipe(
  Effect.catch((error) => /* … */),
  Effect.withSpan('processEmail')
)
```

For `Effect.fn`, pass combinators as trailing arguments — do not `.pipe` the `Effect.fn` result itself (per LLMS.md).

## Streams

- Keep `Stream.mapEffect(fn, { concurrency })` for per-element effectful work.
- Make `fn` an `Effect.fn` / gen, not a tower of `Effect.flatMap` inside the callback.

## Avoid

- Nested `Effect.flatMap` / `.pipe` towers for multi-step sequential logic (“do A then B then C”).
- Placing two Effects on consecutive lines and expecting both to run — Effects are recipes; compose with `yield*` / `flatMap` / `andThen`.
- `try` / `catch` inside `Effect.gen` — use Effect error channels (`Effect.catch`, `Effect.result`, typed failures).
- `async` / `await` in Effect services — stay on Effect APIs.
