# Reviewer Pass — Refute the Test

The reviewer subagent gets: the generated test, the diff it covers, the spec/intent, and
this checklist. Its job is **adversarial** — try to prove the test is worthless. Default to
rejection when unsure. It must NOT see only the implementation and rubber-stamp.

Return JSON: `{ verdict: "keep" | "fix" | "reject", reasons: string[], mutation: {line, change, predictedKilled}, fixes?: string[] }`.

## The two killer questions (a "no" to either → not "keep")

1. **Would this test still pass after a behavior-preserving refactor** of the code under
   test? It must. If renaming internals or reordering private calls breaks it → it's a
   change-detector → `fix` (assert observable output instead).
2. **Would this test fail if the obvious bug were injected** (flip a comparison, off-by-one,
   wrong branch, drop a `return`)? It must. Name a concrete one-line mutation, predict
   whether the test kills it, and set `mutation.predictedKilled`. If the prediction is "no",
   the assertion is too weak → `fix`.

## Checklist (fail any item → `fix` or `reject`)

**Intent**
- [ ] Test name states scenario + expected outcome in business terms (not "works", "handles input").
- [ ] Intent readable from name + assertions alone, without reading the implementation.
- [ ] Expected values derive from the spec, **not** recomputed by the impl's own formula.

**Assertion quality**
- [ ] ≥1 assertion checks a specific value/shape — not just `toBeDefined`/`toBeTruthy`/non-null.
- [ ] No assertion re-derives what the function under test computes.

**Mocking**
- [ ] Mocks only at real boundaries (I/O, network, external services).
- [ ] Does not mock the thing under test. Does not assert internal call order/args to private collaborators.

**Determinism**
- [ ] No `Date.now()`, `Math.random()`, real network, or uncontrolled timers.
- [ ] Identical result on every run, any environment.

**No gaming / no side effects** (any hit → `reject`)
- [ ] Does NOT branch on the test runner or environment (`process.env`, `STRYKER_*`, `import.meta`) — detecting a mutation run to fake kills is forbidden.
- [ ] Does NOT shell out, spawn processes, or read/write the filesystem or network outside a declared, mocked boundary.
- [ ] The diff under review changes **only test files** — no edit to the source under test, no added `Stryker-disable`/coverage-ignore comment (that disables mutants instead of catching them).

**Abstraction**
- [ ] Touches only public API. No imported unexported symbols.
- [ ] No snapshot of a mutable data object as the assertion.

**comcom fit**
- [ ] Effect code uses `@effect/vitest` (`it.effect`/`it.scoped`) + `@tooling/testing` layers;
      non-Effect uses plain `vitest`. File lives in `package/test/`.
- [ ] Would pass typecheck + lint (imports resolve, no `as`/`any`, JSDoc where the repo wants it).

## Independence

The reviewer runs in a **fresh subagent context** — it has not seen the test being written.
That separation is the point: it reasons about the contract, not the code it watched get
typed. For a final cross-model audit of a whole batch, route the batch through a different
vendor model; not required per-test.
