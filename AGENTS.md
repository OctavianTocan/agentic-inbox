<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instructions

## Working principles

*These bias toward caution over speed. Use judgment for trivial tasks.*

### Investigate first

- **Read before writing:** Before adding code in a file, read its exports, the immediate caller, and obvious shared utilities. Match existing patterns; never guess. If you don't understand why existing code is structured the way it is, ask before adding to it.
- **Think before coding:** State assumptions explicitly; ask when uncertain. If multiple interpretations exist, present them (don't pick silently). If a simpler approach exists, say so. Push back when warranted.
- **Set verifiable goals:** Transform tasks into pass/fail criteria before starting. "Add validation" becomes "write tests for invalid inputs, then make them pass". Weak criteria require constant clarification; strong criteria let you loop independently.
- **Surface conflicts, don't average them:** If two existing patterns contradict, don't blend them. Pick one (more recent / more tested), explain why, flag the other for cleanup. "Average" code that satisfies both is the worst code.
- **Activate skills:** Scan all skills (`domain-*`, `practice-*`, `workflow-*`, `tool-*`, `gen-*`, `meta-*`) and activate every relevant one. Trigger on the *task*: `practice-code-quality` for any TS edit, `practice-debug` for bugs, `workflow-plan` before creative work. Missing a skill is the #1 source of convention violations.

### Write minimum

- **Simplicity first:** Minimum code that solves the problem. No features beyond what was asked, no abstractions for single-use code, no "flexibility" that wasn't requested, no error handling for impossible scenarios. If 200 lines could be 50, rewrite it.
- **Surgical changes:** Every changed line traces directly to the request. Don't refactor or "improve" adjacent code; match existing style even if you'd do it differently. Remove imports/variables your changes orphaned; don't touch pre-existing dead code (mention it).
- **No obsolete paths by default:** During active product iteration, remove old behavior and state instead of preserving transitional fallbacks unless explicitly requested.
- **Fix root causes**, not symptoms.
- **Composability:** Build simple, extensible primitives and compose them. Avoid bespoke monoliths.

### Verify honestly

- **Tests verify intent, not behavior:** Every test must encode WHY the behavior matters, not just WHAT it does. `expect(getUserName()).toBe('John')` is worthless if the function takes a hardcoded ID. If a test wouldn't fail when business logic changes, the function is wrong.
- **Bug fixes require regression tests:** Every bug fix must add or update tests that fail for the bug and pass for the fix. If an automated regression test is impossible, explain why and document the manual verification used.
- **Fail loud:** Surface uncertainty rather than hiding it. "Migration completed" is wrong if records were silently skipped. "Tests pass" is wrong if you skipped any. "Feature works" is wrong if you didn't verify the edge case asked about.

## Purpose

Cogram take-home task: an agentic inbox for an AEC (architecture/engineering/
construction) project. An AI agent processes a **fixed set of 80 emails**
(`data/emails.json`, no new mail arrives) and for each one either acts
autonomously (routine: RFIs, daily reports, submittals, vendor quotes,
schedule pings, status updates) or defers to the human (sensitive: change
orders, claims/disputes, safety incidents, owner escalations). Full brief:
`docs/TASK.md`.

Constraints that matter for implementation:

- **Sensitive emails must never be auto-actioned.** If a wrong auto-reply
  could cost real money or create legal exposure, the agent defers — it does
  not send, promise, or commit anything on its own.
- **Every agent action must be legible.** The user has to be able to see what
  the agent did (or didn't do) and why, in plain language, per email.
- **Fast review is a hard requirement.** Design for a PM with ~5 minutes
  between meetings triaging the whole inbox, not for reading each email in
  full.
- **Wrong calls must be cheaply reversible.** Any auto-action the agent took
  needs an easy undo/redo or re-triage path — this is a first-class feature,
  not an edge case.
- **The dataset is static.** 80 emails, ids `e-001`..`e-080`, keys `id`,
  `from`, `to`, `cc`, `subject`, `body`, `timestamp`, `in_reply_to`. No
  pagination, streaming inbox, or live mail integration is needed.

## Project Shape

- This is a Bun workspace (originally scaffolded from `cogram-ai-app-template`) with a Next.js frontend and an optional Effect v4 backend.
- `apps/web` is the Next.js 16 App Router frontend.
- `apps/api` is the Effect v4 backend API.
- `packages/api-core` owns the HTTP API contract and schemas.
- `packages/clients/ai-sdk` wraps the Vercel AI SDK in Effect.
- Use `apps/web/src/design-system` before adding new UI primitives.
- Use `apps/web/src/ai-ui` for headless AI composer/thread behavior.
- Keep frontend imports local: `@/design-system/...`, `@/ai-ui/...`, and `@/...`.
- Design intent lives in `DESIGN.md`.
- The email dataset lives in `data/emails.json`; the task brief lives in `docs/TASK.md`.
- CodeGraph local indexes live in `.codegraph/` and are ignored by Git.
- Keep `vendor/`, `.agent/`, `.codegraph/`, and generated `.next/` output out of
  TypeScript LSP project discovery.

## Skills

Repo-local skills live in `.agent/skills`.

- `domain-design`: visual language and interaction rules from the source design system.
- `domain-frontend`: frontend architecture, component anatomy, testing, and Next.js conventions.
- `practice-code-quality`: TypeScript/code-quality guardrails.
- `practice-debug`: debugging workflow.
- `effect-v4-project-starter`: Effect v4 backend/workspace shape.
- `workflow-test-gen`: test planning and generation.
- `cleanup-unused-project-surface`: unused backend, frontend, UI, and design
  surface audit with verifiable non-usage evidence.
- `gen-github-workflow`: workflow-generation reference.
- `gen-skills`: skill-generation reference.
- `shelf-workflow-plan`: Shelf planning workflow.
- `shelf-workflow-gen`: Shelf workflow-fragment generation reference.
- `ponytail`: minimal-diff ladder for avoiding overbuild.
- `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`: Ponytail review and maintenance helpers.

Activate the relevant skill before changing the matching area. For substantial
design work, read `domain-design` and `domain-frontend` first.

## Working Rules

- Read the files you touch and obvious callers before editing.
- Prefer the smallest working change.
- Keep frontend-only AI experiments in `apps/web` unless the user chooses a backend.
- When the user chooses a backend, put contracts in `packages/api-core`, handlers in `apps/api`, and AI SDK integration behind `packages/clients/ai-sdk`.
- Use Effect v4 beta pins from the root workspace catalog; do not accidentally install Effect v3.
- No default exports except Next.js route/page/layout files.
- Tests live in package-level `test/` directories.
- Use `bun`/`bunx`, not npm/yarn/pnpm.
- Use CodeGraph for architecture/code-navigation questions when the local graph
  exists; fall back to `rg` when it does not.
- Use `tailscale serve` only for private dev previews; do not use Funnel unless
  the user explicitly requests public exposure.

## Verification

- Run `bun run typecheck`, `bun run lint`, and `bun run test` before calling work complete.
- Run `bun run build` after changes to routing, app layout, or production config.
- Run `bun run dev:api` to smoke the backend locally; health is `GET /api/v1/health`, docs are `/docs`.
- Run `bun run react:doctor` for React-specific audits when changing component behavior.
- Run `bun run arch:sentrux` when Sentrux is installed locally.


## Conventions

### Type safety

- No type casting (`as`, `as any`, `as unknown as`, `<Type>expr`, `expr!`). Fix the underlying type.
- No TypeScript enums; use unions or const objects.
- Derive types from source: `typeof table.$inferSelect`, `z.infer<...>`, `Schema.Type<...>`.

### Imports

- Scoped path aliases for cross-package (`@apps/*`, `@platform/*`, `@comcom/*`, `@ui/*`, `@clients/*`, `@tooling/*`, `@infra/*`, `@ci/*`, `@agent-dev/*`); `@/*` for local.
- Import directly from files, never from `index.ts` barrels: `@ui/design-system/components/ui/button`, not `@ui/design-system`.
- Approved package-export exception: `@ui/design-system/components/icons` is the design-system icon registry; direct `lucide-react` imports belong there.
- No file extensions in imports (`.ts`, `.tsx`, `.js`).

### Tests

- Tests live in package-level `test/` directories, not next to source.

### Comments

- No section-divider comments (e.g. `// ----`).
- Inline comments explain non-obvious WHY, never restate WHAT. If reading the code already makes its behavior obvious, the comment is noise: delete it. No references to current task/PR/ticket; that belongs in the commit message.
- JSDoc on every function (exports AND non-exported helpers) describes the interface, never the implementation. Non-exported helpers get a single-line summary; exported and public surfaces (service/repo methods, exported functions) also carry proper `@param`/`@returns` (plus `@template`/`@throws` as relevant), each stating the caller's contract rather than the type. See `practice-code-quality`.

### Exports

- Named exports for reusable components. Default exports only for Next.js pages/layouts.
- Reuse types from sibling modules; never redefine a type that already exists in a dependency.

### Subagents

- **Bucket then dispatch:** Decompose non-trivial work into independent buckets, one subagent per bucket. Many small focused buckets beat one monolith: parallelizes execution, keeps each context tight, isolates failures. Bucketing is the default for large tasks, not an optimization.
- **Foreground vs background:** Foreground when you need results inline; background (async, notified on completion) for independent parallel work. Both inherit full Read/Write/Edit/Bash; restrict via `subagent_type` (`Explore`/`Plan`) for read-only. No concurrent cap.
- **Brief them fully:** Subagents start with fresh context. Every prompt needs a full overview, explicit step-by-step instructions, and the skills they must activate. Partial context is never enough.
- **Models:** `claude-opus-4-7` for any code-writing subagent (no exceptions). Research subagents may use `claude-sonnet-4-6` or `claude-haiku-4-5`; they retain full code read access and should use it freely rather than answering from training.

#### Teams (research, design, critique)

For hard research questions, design tradeoffs, or critique passes, spawn a *team* of background agents in parallel, each with a distinct expert lens (e.g. security, performance, UX, a relevant `domain-*` skill). Frame each lens role neutrally ("evaluate from a security perspective"), never the conclusion ("explain why X is right"). Synthesize in the parent: surface conflicts honestly, decide.

### Effect-TS

Any edit to a file that imports from `effect` or `@effect/*` is an Effect change: activate `domain-effect` and `domain-effect-source` (mandatory even for "small" changes, since that is where API drift hides). Those skills own the rules: reference docs, vendor-source citations, the Effect Expert subagent, and `effect:check-skill-drift`.

### Pull requests

Write the title and description for a tired reviewer who should know what the PR does in five seconds. See `practice-pr`; `domain-git` owns the required body sections.

- Title: keep the `type(scope): summary` prefix, then a plain imperative phrase. No PR/issue numbers, slice counts like `(3/8)`, diff stats, or emoji.
- Description: lead with one sentence saying what changed and why. Bullets over paragraphs, one change each.
- Validation lists only commands and checks you actually ran.
- Cut filler openers ("This PR…"), invented numbers (file/diff counts — GitHub shows them), and AI tells ("comprehensive", "robust", "seamless").

### Verification

- Run `bun run ci` (repo-policy + lint + typecheck + tests + arch:sentrux + effect:check-skill-drift + knip) before committing or pushing; never claim work complete without clean output.
- Scoped subsets: `bun run check` (lint), `bun run typecheck`, `bun run test`.
