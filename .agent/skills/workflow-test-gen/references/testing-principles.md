# Testing Principles (for generated tests)

Prescriptive rules a generated test must obey. The reviewer pass (`reviewer-checklist.md`)
enforces them. Citations are for the non-obvious claims.

## 1. Line coverage is not a quality signal

Coverage measures *was this line executed*, not *did anything verify it*. A test with
zero assertions hits 100% line coverage and catches nothing. Treat coverage as a
*developer tool for finding blank spots*, never as a target — when a measure becomes a
target it stops measuring (Goodhart). The real signal is **mutation score** (§3).

- Martin Fowler, *TestCoverage*: <https://martinfowler.com/bliki/TestCoverage.html>
- Coverage↔mutation-score correlation is weak/zero: <https://arxiv.org/pdf/2309.02395>

## 2. Tests verify intent, not behavior

A test must encode **why** a behavior matters and **fail when the business logic
changes**, while surviving pure refactors (Kent Beck, *Programmer Test Principles*:
<https://medium.com/@kentbeck_7670/programmer-test-principles-d01c064d7934>).

The filter for every test: *if I injected the most obvious bug here — wrong operator,
off-by-one, wrong branch — would this test fail?* If no, it is false confidence.

Expected values come from the **specification**, derived independently — never recomputed
by the same formula the code uses:

```ts
// BAD: expected value re-derives the implementation; passes even if both are wrong
expect(discount(100, 0.2)).toBe(100 * (1 - 0.2));
// GOOD: oracle value from the spec ("20% off $100 = $80")
expect(discount(100, 0.2)).toBe(80);
```

## 3. Mutation testing is the real gate

Stryker injects small bugs (`>=`→`>`, `true`→`false`, delete `return`) and reruns the
suite. *Killed* = a test failed (good). *Survived* = no test noticed (a real gap).
Mutation score = `killed / (killed + survived)`. Assertion-free tests score 0% however
high their line coverage. Gate: `break: 50`, target 60% (80% for critical modules).
See `stryker-setup.md`. Docs: <https://stryker-mutator.io/docs/>

## 4. Test pyramid / trophy — where AI tests are safe

- **Pure functions → unit tests:** ideal for generation.
- **Module boundaries → integration tests:** valuable but AI over-mocks; mock only at
  real seams. "The more your tests resemble how the software is used, the more
  confidence" (Kent C. Dodds: <https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications>).
- **E2E / stateful / async:** most dangerous for AI (flaky, mis-mocked). Avoid generating
  here unless explicitly asked.

## 5. Property-based testing (fast-check) when a contract exists

For mathematical contracts — round-trips (`parse(serialize(x)) === x`), idempotency,
commutativity — or large/irregular input spaces, a property test beats hand-picked
examples and shrinks failures to the minimal case. Skip it when the input space is small
or the property is more complex than the code. <https://fast-check.dev/>

## 6. Failure modes of AI-generated tests (guard against every one)

1. **Tautological / circular** — expected value re-derived from the impl. *Fix:* spec-derived
   oracles. Detect via surviving mutants. (<https://betterqa.co/5-ai-testing-anti-patterns-we-see-in-every-engagement/>)
2. **Over-mocking** — agents mock far more than humans (~36% vs 26% of test commits:
   <https://arxiv.org/html/2602.00409v1>). *Fix:* mock only I/O / network / external
   services; never the thing under test. >2 mocks → reconsider the seam.
3. **Change-detector** — asserting internal call order / private state; breaks on refactor.
   *Fix:* assert only public outputs + observable side effects.
   (<https://testing.googleblog.com/2015/01/testing-on-toilet-change-detector-tests.html>)
4. **Assertion-weak** — `toBeDefined()`/`toBeTruthy()` where an exact value is knowable.
   *Fix:* assert the specific value/shape.
5. **Flaky** — depends on `Date.now()`, `Math.random()`, network, timers. *Fix:* inject and
   control all non-determinism. Flaky tests should be deleted, not retried.
6. **Wrong abstraction level** — importing/asserting unexported internals. *Fix:* public API only.
7. **Snapshot-everything** — locks in current output incl. bugs, blind-updated. *Fix:* snapshots
   only for stable rendered UI a human reviews; never for data objects / API responses.
8. **Code-and-tests-from-same-read** — same context writes impl and test, same bug in both.
   *Fix:* ground tests in the spec; then mutation-test to catch what the author couldn't see.
9. **Assertion drift** — silently loosening `toBe`→`toBeGreaterThan` to stay green. *Fix:*
   assert strength only tightens; loosening is an explicit human decision.

## 7. When to stop

Gate met (`SKILL.md`): every changed behavior has an approved intent test, mutation score
≥ 60% (or ≥ 80% critical), all tests deterministic and checklist-clean. Past ~80% mutation
score the cost of killing the last survivors (defensive guards, trivial accessors) exceeds
the value. Stop. Do not chase 100% of anything.
