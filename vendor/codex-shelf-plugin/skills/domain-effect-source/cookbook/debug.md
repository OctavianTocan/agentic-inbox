# Debug an Effect Issue

## Context

Trace an Effect-related bug or unexpected behavior through the actual Effect source code to find root cause.

## Input

The error, stack trace, or unexpected behavior, plus the project code that's failing.

## Steps

### 1. Identify the Effect Surface

Determine which Effect module is involved. Common patterns:

| Symptom | Likely Module | Vendor Path |
|---------|--------------|-------------|
| "Service not found" | Context / Layer | `effect/src/Context.ts`, `effect/src/internal/layer.ts` |
| Type error on `Effect.fn` | Effect core | `effect/src/Effect.ts` (search `fn`) |
| Schema decode failure | Schema | `effect/src/Schema.ts`, `effect/src/internal/schema/` |
| Stream hangs or drops elements | Stream | `effect/src/Stream.ts`, `effect/src/internal/stream.ts` |
| Scope / finalizer not running | Scope / Resource | `effect/src/Scope.ts`, `effect/src/internal/core.ts`, `effect/src/internal/effect.ts` |
| Fiber interrupted unexpectedly | Fiber / Scope | `effect/src/Fiber.ts`, `effect/src/internal/effect.ts` |
| HttpApi routing mismatch | HttpApi | `effect/src/unstable/httpapi/HttpApi.ts`, `effect/src/unstable/httpapi/HttpApiBuilder.ts` |
| SQL query error | SQL | `effect/src/unstable/sql/SqlClient.ts`, `effect/src/unstable/sql/SqlResolver.ts` |
| Schedule not firing | Schedule | `effect/src/Schedule.ts`, `effect/src/internal/schedule.ts` |
| Layer memo / circular dep | Layer | `effect/src/internal/layer.ts` |

### 2. Read the Relevant Source

Read the public API first for the function signature and documented behavior:

```bash
grep -n '<functionOrSymbol>' vendor/effect-smol/packages/effect/src/<Module>.ts | head -20
```

Then read the implementation to understand actual behavior:

```bash
grep -rn '<functionOrSymbol>' vendor/effect-smol/packages/effect/src/internal/ --include='*.ts' | head -20
```

### 3. Trace the Execution Path

Follow the call chain from the project code through the Effect source:

1. Find what the project code calls
2. Read that function's implementation in vendor/effect-smol
3. Check preconditions, error paths, and edge cases
4. Compare against what the project code expects

### 4. For Complex Issues — Spawn Expert Subagent

If the trace spans multiple modules or the behavior is non-obvious, spawn the debug subagent from [cookbook/review.md](review.md) (debug variant) with the full context.

### 5. Report Findings

For every finding:
- **What the project code does** — exact file and line
- **What the Effect source says** — exact vendor/effect-smol file and line
- **Where the divergence is** — the specific mismatch
- **The fix** — what to change in the project code, citing the Effect API that supports it

## Done

Report:
- Root cause with Effect source citations
- Whether it's a project bug, an Effect API misunderstanding, or an actual Effect bug
- The fix, grounded in the Effect source API
