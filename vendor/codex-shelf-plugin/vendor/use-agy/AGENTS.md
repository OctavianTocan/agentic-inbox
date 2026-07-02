# Agent Instructions

use-agy is a small **Bun + TypeScript monorepo** for agent tooling, built on **Effect v4** (the
`effect-smol` line). It is a Bun workspace: shared tooling lives in `packages/`, agent skills and
commands live under `.agents/`. This file is the day-to-day operating contract; the skills under
`.agents/skills/` own the detailed conventions.

## Working principles

*These bias toward caution over speed. Use judgment for trivial tasks.*

### Investigate first

- **Read before writing:** Before adding code in a file, read its exports, the immediate caller, and obvious shared utilities. Match existing patterns; never guess. If you don't understand why existing code is structured the way it is, ask before adding to it.
- **Think before coding:** State assumptions explicitly; ask when uncertain. If multiple interpretations exist, present them (don't pick silently). If a simpler approach exists, say so. Push back when warranted.
- **Set verifiable goals:** Transform tasks into pass/fail criteria before starting. "Add validation" becomes "write tests for invalid inputs, then make them pass". Weak criteria require constant clarification; strong criteria let you loop independently.
- **Surface conflicts, don't average them:** If two existing patterns contradict, don't blend them. Pick one (more recent / more tested), explain why, flag the other for cleanup. "Average" code that satisfies both is the worst code.
- **Activate skills:** Scan the skills under `.agents/skills/` (`domain-*`, `practice-*`, `workflow-*`, `meta-*`, `skill-gen`, and `workflow-gen`) and activate every relevant one. Trigger on the *task*: `domain-effect` for any Effect change, `practice-debug` for bugs, `workflow-plan` before creative work, `skill-gen` when touching `//<skill-gen>` fragments, `workflow-gen` when touching `//<workflow-gen>` fragments. Missing a skill is the #1 source of convention violations.

### Write minimum

- **Simplicity first:** Minimum code that solves the problem. No features beyond what was asked, no abstractions for single-use code, no "flexibility" that wasn't requested, no error handling for impossible scenarios. If 200 lines could be 50, rewrite it.
- **Surgical changes:** Every changed line traces directly to the request. Don't refactor or "improve" adjacent code; match existing style even if you'd do it differently. Remove imports/variables your changes orphaned; don't touch pre-existing dead code (mention it).
- **No obsolete paths by default:** During active iteration, remove old behavior and state instead of preserving transitional fallbacks unless explicitly requested.
- **Fix root causes**, not symptoms.
- **Composability:** Build simple, extensible primitives and compose them. Avoid bespoke monoliths.

### Verify honestly

- **Tests verify intent, not behavior:** Every test must encode WHY the behavior matters, not just WHAT it does. `expect(getUserName()).toBe('John')` is worthless if the function takes a hardcoded ID. If a test wouldn't fail when business logic changes, the function is wrong.
- **Bug fixes require regression tests:** Every bug fix must add or update tests that fail for the bug and pass for the fix. If an automated regression test is impossible, explain why and document the manual verification used.
- **Fail loud:** Surface uncertainty rather than hiding it. "Migration completed" is wrong if records were silently skipped. "Tests pass" is wrong if you skipped any. "Feature works" is wrong if you didn't verify the edge case asked about.
- **Gate on exit codes:** Run `bun run ci` before claiming work complete; gate on its exit code, never on grepped output. No browser/dev-server review — this repo ships libraries and CLIs, not UI.

## Structure

```
.agents/
  skills/                 Agent skills (hand-written + generated)
    skill-gen/            Generated from packages/ci/skill-gen/src/index.ts
    workflow-gen/         Generated from packages/ci/workflow-gen/src/index.ts
    domain-effect/        Effect v4 patterns: services, layers, schema, errors
    domain-cli/           effect/unstable/cli structure and examples
    domain-git/           Commit and PR conventions
    domain-package/       Authoring a package in this workspace
    domain-configs/       Config-file router (biome, knip, vitest, tsconfig)
    workflow-*/            Planning, finishing, and codebase-improvement workflows
    meta-*/                Skill-writing and repo-housekeeping meta-skills
    practice-debug/        Debugging discipline
  commands/               Slash-command definitions for agents

packages/
  ci/skill-gen/           Skill-file generator (Bun + Effect v4 CLI)
  ci/workflow-gen/        GitHub Actions workflow generator (Bun + Effect v4 CLI)
  ci/actions/             Co-located CI checkers that contribute workflow fragments
  tooling/typescript-config/  Shared tsconfig presets (base.json, bun.json)

.github/
  actions/setup/          Shared GitHub Actions setup composite action
  workflows/              Generated by workflow-gen

plans/                    Design and implementation plans
required-workflows.json   Generated required status-check list
vendor/effect-smol/       Effect v4 source (git submodule) — reference, not built

biome.jsonc               Formatter + linter config (root)
knip.json                 Unused-code analysis (workspace-aware)
vitest.config.ts          Test runner config; vitest.setup.ts adds @effect/vitest testers
tsconfig.json (per pkg)   Extends @tooling/typescript-config
CLAUDE.md                 Symlink to this file
```

New packages follow the conventions the skills describe: Bun runtime, Effect v4 services, and a
package-level `test/` directory.

## Conventions

### Type safety

- No type casting (`as`, `as any`, `as unknown as`, `<Type>expr`, `expr!`). Fix the underlying type.
- No TypeScript enums; use unions or const objects.
- Derive types from their source rather than restating them: `typeof x`, `Schema.Type<...>`.

### Imports

- `@/*` for local imports within a package's `src/`. Use a package's documented scoped alias for cross-package imports; never deep-import another package's internals.
- Import directly from files, never from `index.ts` barrels unless a package explicitly documents a barrel as its public API.
- No file extensions in imports (`.ts`, `.tsx`, `.js`).
- Effect v4 imports come from the single `effect` package and its submodules (`effect/<Module>`, `effect/unstable/*`). This repo is Bun-only, so runtime packages use `@effect/platform-bun` with `BunRuntime` and `BunServices`. See `vendor/effect-smol/migration/v3-to-v4.md`.

### Tests

- Tests live in package-level `test/` directories, not next to source.

### Comments

- No section-divider comments (e.g. `// ----`).
- Inline comments explain non-obvious WHY, never restate WHAT. If reading the code already makes its behavior obvious, the comment is noise: delete it. No references to the current task/PR/ticket; that belongs in the commit message.
- JSDoc on every function (exports AND non-exported helpers) describes the interface, never the implementation. Non-exported helpers get a single-line summary; exported and public surfaces also carry `@param`/`@returns` (plus `@template`/`@throws` as relevant), each stating the caller's contract rather than the type.

### Exports

- Named exports for everything reusable. Default exports only where tooling requires them (a binary entry point).
- Reuse types from sibling modules; never redefine a type that already exists in a dependency.

### Effect-TS (v4 / effect-smol)

Any edit to a file that imports from `effect` is an Effect change: activate `domain-effect`
(mandatory even for "small" changes — that is where API drift hides). The submodule at
`vendor/effect-smol` is the source of truth.

- **Never guess a signature.** Read it from `vendor/effect-smol` before writing it. For anything you wouldn't bet money on (`Context.Service`, `Layer.effect`, `Effect.fn`, a Schema tagged error, `acquireRelease`), cite `vendor/effect-smol/...:<line>` in a comment or the PR description.
- **v4 imports are one package.** `effect` / `effect/<Module>` / `effect/unstable/*`. e.g. the CLI is `effect/unstable/cli` (`Command`, `Flag`, `Argument`), not `@effect/cli`. Filesystem is `effect/FileSystem`. The v3→v4 map is in `vendor/effect-smol/migration/v3-to-v4.md`.
- **Services:** `Context.Service<Self, Shape>()(id)`; build layers explicitly with `Layer.effect` (v4 does not auto-generate them) and wire deps via `Layer.provide`. Name the primary layer `layer`. Prefer `yield*` over `use` so dependencies stay visible.
- **Errors are values:** Schema-based tagged errors in the error channel; never `throw` across boundaries. Recover specific tags with `Effect.catch` / `catchTag` (note: v3 `catchAll` is v4 `Effect.catch`); never a blanket catch that returns a null success.
- **Control flow:** `Effect.gen` for branching, `pipe` for linear transforms; `acquireRelease` / scoped for cleanup; provide platform services with `BunServices.layer` and run entry points via `BunRuntime.runMain` (`@effect/platform-bun`).

### Subagents

- **Bucket then dispatch:** Decompose non-trivial work into independent buckets, one subagent per bucket. Many small focused buckets beat one monolith: parallelizes execution, keeps each context tight, isolates failures. Bucketing is the default for large tasks, not an optimization.
- **Foreground vs background:** Foreground when you need results inline; background (async, notified on completion) for independent parallel work. Both inherit full Read/Write/Edit/Bash; restrict to read-only when the work is research or planning. No concurrent cap.
- **Brief them fully:** Subagents start with fresh context. Every prompt needs a full overview, explicit step-by-step instructions, and the skills they must activate. Partial context is never enough.
- **Models:** use the strongest available coding model for any code-writing subagent. Research subagents may use a faster model; they retain full code read access and should use it freely rather than answering from training.

#### Teams (research, design, critique)

For hard research questions, design tradeoffs, or critique passes, spawn a *team* of background agents in parallel, each with a distinct expert lens (e.g. security, performance, a relevant `domain-*` skill). Frame each lens role neutrally ("evaluate from a security perspective"), never the conclusion ("explain why X is right"). Synthesize in the parent: surface conflicts honestly, decide.

### Pull requests

Write the title and description for a tired reviewer who should know what the PR does in five seconds. `domain-git` owns the required body sections.

- Title: keep the `type(scope): summary` prefix, then a plain imperative phrase. No PR/issue numbers, slice counts like `(3/8)`, diff stats, or emoji.
- Description: lead with one sentence saying what changed and why. Bullets over paragraphs, one change each.
- Validation lists only commands and checks you actually ran.
- Cut filler openers ("This PR…"), invented numbers (file/diff counts — GitHub shows them), and AI tells ("comprehensive", "robust", "seamless").

### Verification

- `bun run ci` is the full gate: `biome check .` + `tsc --noEmit` (per package) + `vitest run` + `knip` + generated artifact drift checks. Run it before committing or claiming work complete.
- Individual gates: `bun run check` (Biome), `bun run typecheck`, `bun run test`, `bun run knip`.
- After editing `//<skill-gen>` fragments: `bun run skill-gen:generate`, then `bun run skill-gen:check` (drift check). `bun run skill-gen:e2e-test` exercises the generator against fixtures.
- After editing `//<workflow-gen>` fragments: `bun run workflow-gen:generate`, then `bun run workflow-gen:check` (drift check). `bun run workflow-gen:e2e-test` exercises the generator against fixtures.
- On an Effect version bump, review `vendor/effect-smol/migration/` and keep the `effect` catalog pin in `package.json` in sync.
