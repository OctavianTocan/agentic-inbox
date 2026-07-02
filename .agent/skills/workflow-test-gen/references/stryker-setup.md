# Mutation Gate — Stryker against comcom Vitest

The gate is mutation score on the **changed files only**, run per owning package. Stryker
is invoked on-demand by the workflow (via `bunx`), not committed as a repo dependency —
making it a permanent CI gate is a separate infra PR (knip/turbo/CI wiring). Until then the
skill brings its own config and runs it ad hoc.

> Compatibility note: comcom is on **Vitest 4** (very new). Verify
> `@stryker-mutator/vitest-runner` supports it before trusting the gate. If the runner
> errors on Vitest 4, use the **fallback** below and report that mutation was skipped — do
> not pretend the gate passed.

## Per-package run, scoped to changed files

For each package with changed files, from the package dir:

```bash
cd packages/<scope>/<name>   # or apps/<name>
bunx --bun stryker run \
  --testRunner vitest \
  --plugins @stryker-mutator/vitest-runner \
  --mutate "src/changed-a.ts,src/changed-b.ts" \   # ONLY the changed source files
  --incremental \
  --reporters json,progress \
  --coverageAnalysis perTest \
  --concurrency 4 \
  --thresholds.break 50
```

- `--mutate "<file,file>"` scopes mutation to the diff — never mutate the whole package
  (slow and off-topic). Compute the list from `git diff --name-only origin/main` filtered to
  that package's `src/`.
- **Paths are PACKAGE-RELATIVE.** You `cd` into the package dir first, so `--mutate` takes
  `src/foo.ts`, not the repo-root `packages/<scope>/<name>/src/foo.ts` (passing the latter
  makes Stryker look for `<pkgdir>/<pkgdir>/src/foo.ts` and mutate 0 files). The workflow
  hands the measure agent package-relative paths already.
- **Anti-gaming.** Before trusting a score, confirm `git diff --name-only` shows only test
  files changed since the tests were generated. A generator that edits the source under test,
  adds a `Stryker-disable` comment, or makes tests detect the runner can fake a high score —
  invalidate the gate (don't pass) if any of these are present.
- **Scope to changed LINES, not whole files.** Stryker accepts a line range:
  `--mutate "src/foo.ts:10-25"`. Use the diff's changed line ranges. Verified necessity: a
  whole-file run on a file where only one function changed counts the *other* functions'
  mutants as `NoCoverage` and tanks the overall score (e.g. 81% on the changed function read
  as 52% file-wide). Gate on the changed region's score, computed from the JSON report's
  per-mutant locations — ignore `NoCoverage` mutants outside the changed lines.
- `--incremental` writes `reports/stryker-incremental.json`; reuse it across loop iterations
  so only re-touched code is re-mutated. `--force` to rebuild it.
- `--thresholds.break 50` makes Stryker exit non-zero below 50%; the workflow reads the JSON
  report's `mutationScore` and compares against the gate (60%, or 80% critical) itself.

If a package needs a non-default Vitest config (e.g. `apps/api` has unit/integration/e2e
splits), point the runner at the unit config:

```bash
  --vitest.configFile vitest.unit.config.ts
```

## Reading the result

The JSON report (`reports/mutation/mutation.json` or the configured path) carries per-file
`mutationScore` and the list of `Survived` mutants with their locations. The workflow:

1. Fails the iteration's behavior if its file's score < gate.
2. Feeds the **surviving mutants** (location + the mutation that lived) back to the next
   generate step as the precise gap to close — this is the loop's signal, far better than a
   coverage delta.

## Fallback when Stryker can't run

Run Vitest's own v8 coverage scoped to the package and gate on **branch coverage of changed
lines ≥ 80%** plus the reviewer checklist:

```bash
cd packages/<scope>/<name>
bunx vitest run --coverage --coverage.provider v8 \
  --coverage.reporter json --coverage.include "src/changed-*.ts"
```

Parse `coverage/coverage-final.json`, intersect covered lines with the changed line ranges
from the diff, and require ≥ 80% of changed branches hit. Note in the report that the
mutation gate was skipped and why. (comcom has `@vitest/coverage-v8` only in `apps/api`
today; `bunx` pulls it where missing.)
