---
name: practice-code-quality
description: "Use when writing or reviewing TypeScript in the monorepo: authoring new functions, naming variables or booleans, adding JSDoc, structuring files, choosing parameter shapes, or deciding between readonly and mutable types. Framework-specific skills (domain-effect, domain-frontend, domain-database) refine these rules for their areas."
---

# Code Quality

Universal patterns for clean, readable, maintainable TypeScript across the monorepo.

The universal gates (no casts, no enums, derive types from source, scoped-alias imports, tests in `test/`, interface-level JSDoc, remove obsolete paths, `bun run ci` before completion, no browser review) are canonical in `AGENTS.md` (Conventions); this skill adds the naming, structure, and immutability deltas below.

## Quick Reference

| Area | Rule |
|---|---|
| Booleans | Verb prefix: `is*`, `has*`, `can*`, `should*`. Never negative. No boolean positional params; use an options object. |
| Constants | `UPPER_SNAKE_CASE` for config/env only, else `camelCase`. |
| Parameters | Max 2 positional. Destructure at 2+ uses. `(id, input)` or `(id, options?)`. |
| Return types | Exported: always annotate. Internal: annotate when complex. |
| Immutability | Default `readonly` for non-mutated array/object params. |
| Function shape | Guard clauses at top, happy path at bottom. Braces on all `if`. |
| Files | One concept per file. Split at 100 lines or when name needs "and". |
| Type declarations | Prefer `type`; `interface` for object shapes via `extends`/declaration merging, required for `declare module`. |
| Errors | Never fire-and-forget. Handle the specific failure, not a broad `catch (e)`. |

## Naming

### Booleans

Verb prefix, no bare adjectives or nouns:

| Prefix | Meaning | Examples |
|--------|---------|----------|
| `is*` | Current state | `isLoading`, `isOpen`, `isValid` |
| `has*` | Existence | `hasError`, `hasChildren`, `hasPermission` |
| `can*` | Capability | `canEdit`, `canDelete`, `canSubmit` |
| `should*` | Conditional behavior | `shouldValidate`, `shouldRetry`, `shouldRender` |

Never negative (`isNotReady`); invert. Derived booleans keep the prefix:

```typescript
// Good
const canSubmit = isValid && !isLoading

// Bad — bare adjective
const loading = query.status === 'pending'
```

### Constants

`UPPER_SNAKE_CASE` for environment constants, config values, and fixed domain constants (`MAX_RETRIES`, `API_BASE_URL`, `DEFAULT_PAGE_SIZE`). `camelCase` for everything else.

## Function Structure

### Early Returns

Guard clauses at the top, happy path at the bottom. Never nest the main logic inside an `if/else`. All `if` statements use braces:

```typescript
function processOrder(order: Order): Result {
  if (!order.isValid) return Result.invalid(order.id)
  if (order.isCancelled) return Result.cancelled(order.id)
  if (!inventory.hasStock(order.itemId)) return Result.outOfStock(order.itemId)

  const receipt = checkout(order)
  notify(order.customerId, receipt)
  return Result.success(receipt)
}
```

### Single Responsibility

A function should do one thing. Split by responsibility, not line count. Biome enforces cognitive complexity via `noExcessiveCognitiveComplexity`; if it flags a function, extract.

### Delegate, Don't Duplicate

When two functions share logic, the action delegates to the check; never re-implement the conditions:

```typescript
export function publish(post: Post): Result {
  if (!canPublish(post)) return Result.error('Cannot publish')
  return doPublish(post)
}
```

### Parameters

- Max 2 positional parameters. 3+ values go in an object.
- Destructure when using 2+ properties from the same object. Don't destructure for a single access.
- No boolean positional parameters; they hide meaning at call sites. Use an options object: `sendNotification(userId, { immediate: true })`.

| Pattern | When | Example |
|---------|------|---------|
| `(input)` | Create with required data | `create(input: CreateUserInput)` |
| `(id)` | Single-entity read/delete | `get(id: UserId)` |
| `(id, input)` | Update with required data | `update(id: UserId, input: UpdateUserInput)` |
| `(id, options?)` | Read with optional config | `get(id: UserId, options?: GetUserOptions)` |
| `(options?)` | List/query with filters | `list(options?: ListUsersOptions)` |

Required data uses `input`; optional config uses `options`. Domain skills may refine (e.g. `params` in API modules, `payload` for events).

## JSDoc

Every function (exports AND non-exported helpers) gets JSDoc that describes the **interface** (what the caller passes and receives) and **never the implementation** (algorithms, internal helpers, storage mechanics, background fibers, which functions it calls downstream). This holds for every part of the block: the summary, every `@param`, and `@returns` alike. If any clause explains HOW the body works, cut it.

- **Public surfaces** (exported functions, service/repo/class methods): a summary line, plus `@param` for every parameter, `@returns` for every non-void return, and `@template`/`@throws` (`@errors`) where they carry contract. These tags are **required** on public surfaces: never drop one because its type "looks obvious". Write each to state the parameter's role or the return's meaning, not a restatement of the type.
- **Private helpers** (not reachable from any export): the single-line summary only. Do not add `@param`/`@returns` boilerplate.

## Inline Comments

Inline comments explain non-obvious WHY, never restate WHAT. If reading the code already makes its behavior obvious, the comment adds nothing and is worse than none: it costs reading time and sends readers hunting for meaning that isn't there. Delete it. Keep only a genuine, non-obvious WHY, capped at 1-2 lines. No references to the current task, PR, or ticket; that context belongs in the commit message.

## Type Declarations

Prefer `type` for first-party declarations. `interface` is acceptable for object shapes that use `extends` or declaration merging, and is required for `declare module`. Unions, mapped, conditional, and derived types require `type`. Effect Schema, Drizzle `$inferSelect`, and Zod all produce types, not interfaces.

## Return Types

| Context | Annotate? |
|---------|-----------|
| Exported functions | Always — documents the contract, speeds up type checking |
| Non-exported functions | When complex; infer for simple returns |

Specific frameworks may add return-type rules for their patterns (hooks, components, services).

## Immutability

Default to `readonly` for array and object parameters the function does not mutate, including domain entities, configs, and DTOs. Use `readonly T[]` (or `ReadonlyArray<T>`) for arrays and `Readonly<T>` for objects. Omit `readonly` only when the function intentionally mutates.

```typescript
export function summarize(items: readonly Item[]): Summary {
function applyConfig(config: Readonly<Config>): void {
function shuffle(items: Item[]): void {  // intentionally mutates
```

## File Organization

A "concept" is a component, a service, a hook, or a utility group. Compound families (tightly coupled parts always imported together) are the exception.

Ordering within a file: imports → types/constants → main exports → internal helpers. Blank lines between groups.

Split when:
- Function exceeds 100 lines.
- File name requires "and".
- Tests require complex setup for a single unit.
- You can't describe the file's purpose in one sentence.

## Readability

- **Explaining variables.** Extract compound conditions into named `const` variables, even if used once; the name documents intent (`isRecentSignup`, `hasLowEngagement`).
- **Declare near first use.** Minimize the gap between declaration and usage; don't stack declarations at the top.

## Tests

Test through public interfaces, not implementation details: a test should survive a refactor that keeps behavior identical. Every test encodes intent: assert what the code SHOULD do, not what it currently does. Testing mechanics (fixtures, layers, mocking) are owned by `domain-effect`.

Run the suite to verify a test change — the typechecker does not stand in for it. Vitest strips types, so an assertion comparing mismatched shapes (a `Redacted<string>` against a raw string, an optional field against a required one) compiles under `tsc --noEmit` yet fails at runtime.

## Verifying changes

A check only counts when it proves the thing — running the command is not the proof.

- **Gate on exit codes, not on grepped tool output.** Biome renders a complexity finding as `path lint/complexity/noExcessiveCognitiveComplexity`, which a grep for `lint ` misses, and `git grep -l` counts matching files rather than matches — a script that decides "clean" by pattern-matching output gives false confidence. Branch on the command's exit status instead.
- **Lint sees each PR's own diff.** `biome check --changed` only inspects files a commit touched, so a violation can hide on every PR except the one that introduced the file. Verifying a stack means checking each PR's changed set, not only the final tip.
- **Clear incremental caches between sequential checkouts.** `*.tsbuildinfo` and the turbo cache survive `git checkout` and yield phantom typecheck results — a "file not found" for a path another branch added, or a stale type from a sibling. Delete them between branches; when local and CI disagree, the clean-container CI run is the ground truth.

## Error Handling

Every async operation handles errors and surfaces user feedback; never fire-and-forget. Model expected failures as typed, explicit values; handle the specific failure, not a broad `catch (e)`. If a function can fail, its return type says so.

Framework specifics: `domain-effect` (tagged errors, `Effect.catchTag`), `domain-frontend` (query error boundaries, toast surfacing), `domain-database` (transaction rollback, constraint typing).
