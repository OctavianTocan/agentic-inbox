# Lookup an Effect API

## Context

Verify a specific Effect API signature, return type, behavior, or supported options by reading the actual source code. Use this instead of guessing from training data.

## Input

The symbol or pattern to look up: a function name, type, module, or behavioral question (e.g., "does Effect.fn support a second argument?", "what does Schema.TaggedErrorClass accept?").

## Steps

### 1. Locate the Public API

Search for the symbol in the top-level module file. Public APIs are declared as type-level signatures in the main module files.

```bash
# For Effect.* functions
grep -n 'readonly <symbolName>' vendor/effect-smol/packages/effect/src/Effect.ts

# For Schema.* functions
grep -n 'readonly <symbolName>' vendor/effect-smol/packages/effect/src/Schema.ts

# For any module — find which file exports it
grep -rn 'export.*<symbolName>' vendor/effect-smol/packages/effect/src/ --include='*.ts' -l
```

Read the surrounding lines for the full type signature and JSDoc documentation.

### 2. Locate the Implementation

Public modules delegate to internal implementations. Follow the pattern:

| Public Module | Implementation Location |
|---------------|----------------------|
| `Effect.ts` | `internal/effect.ts`, `internal/core.ts` |
| `Schema.ts` | `internal/schema/*.ts` |
| `Stream.ts` | `internal/stream.ts` |
| `Layer.ts` | `internal/layer.ts` |
| `Context.ts` | `internal/core.ts` |
| `Scope.ts` | `internal/effect.ts` (look for `scope`) |
| `Schedule.ts` | `internal/schedule.ts` |
| `Match.ts` | `internal/matcher.ts` |
| `Fiber.ts` | `internal/effect.ts` |
| `Queue.ts` | `internal/core.ts`, `internal/effect.ts` |
| `Ref.ts` | `internal/core.ts` |
| `Cache.ts` | `internal/core.ts`, `internal/effect.ts` |

```bash
grep -rn '<symbolName>' vendor/effect-smol/packages/effect/src/internal/ --include='*.ts' | head -20
```

### 3. Read and Cite

Read the relevant lines. Always report:
- **File path** — Full path from vendor root
- **Line number** — Exact line(s)
- **Signature** — The full type signature
- **Behavior** — What the implementation actually does (not what you think it does)

### 4. Cross-Reference with Project Usage

Search the project codebase for how the symbol is currently used:

```bash
grep -rn '<symbolName>' src/ --include='*.ts' --include='*.tsx' | head -20
```

Flag any divergence between project usage and the actual API contract.

## Done

Report:
- The exact signature from the Effect source with file:line citation
- Any JSDoc or comments from the source that clarify behavior
- Whether current project usage matches the API contract
- If the symbol doesn't exist in the vendor source, say so explicitly
