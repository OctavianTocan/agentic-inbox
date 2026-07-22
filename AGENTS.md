# Agentic Inbox — AGENTS.md

Local agent contract for this repo. Gitignored on purpose. Cursor mirrors live in `.cursor/rules/` and `~/.cursor/rules/`.

Brain map: `.agent/AGENTS.md`.

## Communication

Apply on every reply, including coding, debugging, explanations, planning, and casual chat. Even when the user did not ask for brevity.

### Focus output (scarce attention)

Working memory is small. Knowing is not doing. Starting is hardest. Vague time estimates fail. Visible progress matters.

1. Lead with the next action. First line is something the reader can do now.
2. Number multi-step work. One bounded action per step. No step with "and then" twice.
3. End with one concrete next action under two minutes if anything is open.
4. Suppress tangents. Finish the first issue, then offer the second as a separate question.
5. Restate state every turn ("Step 3 of 5 done: … Next: …").
6. Give specific time estimates in concrete units.
7. Make completed work visible in concrete terms. Do not bury wins.
8. Errors: state cause and fix. No "Uh oh," "Oh no," or "There seems to be."
9. Cap lists at 5. Split into do-now vs later if longer.
10. No preamble, no recap, no closing pleasantries.

Forbidden openers: "Great question," "Let me…," "I'll…," "Sure!," "Looking at your…," "To answer your question…"
Forbidden closers: "Hope this helps," "Let me know if you need anything else," "Happy to clarify," "Feel free to ask."

Break these defaults when:

1. User asks to explain or walk through — explain fully, still no preamble/closer, add skim headers.
2. Destructive action ahead — confirm first. Safety beats brevity.
3. Debug spiral (last three turns still broken) — stop iterating, name the bad assumption, ask one diagnostic question.
4. Real ambiguity — one short clarifying question beats guessing.

Pre-send: delete announcing openers, "anything else?" closers, by-the-way sidebars, empty hedges. First line + last line alone must answer (a) what to do next and (b) what just happened.

### Plain English prose (GOV.UK / GDS + Strunk)

Write and edit in GOV.UK and GDS house style: plain English, active voice, front-loaded, sentence case. Do not use bold or italics for emphasis.

Use for reports, research write-ups, guidance, documentation, summaries, and any prose where clarity matters. Open the content up so anyone can understand it the first time, without losing substance, nuance, or precision. Open up, do not dumb down. Default to this style for reports and pass it to research agents.

Content design principles:

1. Start from the user need — what the reader needs to do or decide.
2. Front-load everything — inverted pyramid: conclusion, then detail, then background.
3. One idea per sentence. One topic per paragraph.
4. Be specific and concrete — numbers, names, dates. Cut "a range of," "going forward," "in terms of."
5. Cut everything that does not add meaning. Shorter is clearer. Remove duplication.

Strunk: clarity, concision, vigor. Prefer definite, specific, concrete language. Omit needless words. Prefer active voice. Put statements in positive form.

Accessibility backing (shape for relevant, findable, understandable, usable):

- ISO 24495-1:2023 — relevant, findable, understandable, usable
- W3C Cognitive Accessibility Guidance — clear words, literal language, short text, separate steps, short critical paths, no reliance on memory (considers ADHD; advisory for WCAG)
- US Plain Writing Act — understandable on the first reading
- JAN ADHD guidance — written, structured, step-by-step instructions (accommodation guidance, not a standard)

## Working principles

*These bias toward caution over speed. Use judgment for trivial tasks.*

### Investigate first

- **Read before writing:** Before adding code in a file, read its exports, the immediate caller, and obvious shared utilities. Match existing patterns; never guess. If you don't understand why existing code is structured the way it is, ask before adding to it.
- **Think before coding:** State assumptions explicitly; ask when uncertain. If multiple interpretations exist, present them (don't pick silently). If a simpler approach exists, say so. Push back when warranted.
- **Set verifiable goals:** Transform tasks into pass/fail criteria before starting. "Add validation" becomes "write tests for invalid inputs, then make them pass". Weak criteria require constant clarification; strong criteria let you loop independently.
- **Surface conflicts, don't average them:** If two existing patterns contradict, don't blend them. Pick one (more recent / more tested), explain why, flag the other for cleanup. "Average" code that satisfies both is the worst code.
- **Activate skills:** Scan repo skills under `.agent/skills/` (`domain-backend`, `commit`, `generated-repo-surfaces`, `inbox-agents-md`, `skill-gen`) and relevant host skills (`flow/*`, `design-md`, `diagnosing-bugs`, `code-review`, …). Activate every relevant one. Trigger on the *task*: `domain-backend` for api-core / apps/api / Postgres layout, `commit` when landing commits, `inbox-agents-md` when touching nested AGENTS.md, `generated-repo-surfaces` / `skill-gen` for codegen. For Effect edits also read `repos/effect-smol/LLMS.md` and the matching file under `docs/agent-patterns/`. Missing a skill is the #1 source of convention violations.

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
- **Verification default:** Don't spin up a browser by default. Run `bun run ci` (`design:lint` + lint + `check:generated:portable` + typecheck + tests) before claiming work complete. For UI/interaction checks that typecheck cannot cover, browser review or `bun run react:doctor` is allowed only after `bun run ci` passes; the user reviews visual design. Prefer `bun run test` / workspace scripts — not bare `bun test`.

## Structure

```
apps/
  api/          Effect v4 HTTP API (Bun local listener; folded into Next on Vercel)
  web/          Next.js 16 App Router frontend, design-system, ai-ui (port 3003)

packages/
  api-core/     @app/api-core: Effect HttpApi contract and schemas for /api/v1
  tooling/
    typescript-config/  @tooling/typescript-config: shared TSConfig presets

data/
  emails.json   Static sample inbox dataset (ids e-001..e-080)

tools/
  openapi-gen/           Deterministic OpenAPI artifact generator/checker
  project-structure-gen/ Updates marked project-structure blocks in .agent/AGENTS.md and README.md
  skill-gen/             Generates repo-local skills from //<skill-gen> fragments
  gen-github-workflow/   Generates GitHub Actions workflows from marked YAML fragments
  workflow-fragments/    CI workflow fragments and required-workflows sync source

docs/
  agent-patterns/  Short pattern distillations for agents (Effect, modules, repos, agent loop, demo, web, OCR)
  plans/           Operator notes and plans when tracked

repos/             Git-subtree vendored library source (Effect under effect-smol). Read-only; do not edit or import.

.agent/            Local-only agent brain (gitignored)
  skills/          Repo-local skills (do not hand-edit generated SKILL.md)
  memory/          Working, semantic, episodic, and preference memory
  protocols/       Tool, permission, and delegation protocols
  tools/           Agent memory / recall utilities
```

Nested deltas (committed): `apps/api/AGENTS.md`, `packages/api-core/AGENTS.md`, `tools/AGENTS.md`. Optional later: `apps/web/AGENTS.md` if a durable Next-only delta appears. Package and app deltas win inside their subtree.

## Conventions

### Type safety

- No type casting (`as`, `as any`, `as unknown as`, `<Type>expr`, `expr!`). Fix the underlying type.
- No TypeScript enums; use unions or const objects.
- Derive types from source: `Schema.Type<...>`, branded ids in api-core Domain schemas, Vitest inference from fixtures.

### Imports

- Cross-package: `@app/api-core`, `@apps/api`, `@tooling/typescript-config`. App-local: `@/*` (web also maps `@/Infrastructure/*`, `@/Lib/*`, `@/Modules/*` into `apps/api/src` for the folded handler).
- Prefer importing from concrete files, not `index.ts` barrels: `@app/api-core/Modules/Triage/Domain`, not a re-export hop. Approved package roots: `@app/api-core` (HttpApi `Api` + middleware) and `@apps/api/WebHandler` when the Next bridge needs the factory.
- Icons: import only from `@/design-system/components/icons`. Do not import `@hugeicons/*` or `lucide-react` outside that registry.
- No file extensions in imports (`.ts`, `.tsx`, `.js`).

### Tests

- Tests live in package-level `test/` directories (`apps/api/test/`, `apps/web/test/`), not next to source.
- Patterns: `docs/agent-patterns/testing.md` (Layer fakes, ConfigProvider, typed HTTP errors).

### Comments

- No section-divider comments (e.g. `// ----`).
- Inline comments must be purposeful: explain non-obvious WHY, never restate WHAT. Lead with what happens or what must stay true; a reader should understand without hunting through the file. If reading the code already makes its behavior obvious, the comment is noise: delete it. No references to current task/PR/ticket; that belongs in the commit message.
- JSDoc on every function (exports AND non-exported helpers) describes the interface, never the implementation. Non-exported helpers get a single-line summary; exported and public surfaces (service/repo methods, exported functions) also carry proper `@param`/`@returns` (plus `@template`/`@throws` as relevant), each stating the caller's contract rather than the type.

### Exports

- Named exports for reusable components and modules. Default exports only for Next.js pages/layouts.
- Reuse types from sibling modules / `@app/api-core`; never redefine a type that already exists in a dependency. Wire schemas stay in api-core; handlers stay in `apps/api`.

### Subagents

- **Bucket then dispatch:** Decompose non-trivial work into independent buckets, one subagent per bucket. Many small focused buckets beat one monolith: parallelizes execution, keeps each context tight, isolates failures. Bucketing is the default for large tasks, not an optimization.
- **Foreground vs background:** Foreground when you need results inline; background (async, notified on completion) for independent parallel work. Restrict via `subagent_type` (`explore` / read-only specialists) when write access is not needed. No concurrent cap beyond tool limits.
- **Brief them fully:** Subagents start with fresh context. Every prompt needs a full overview, explicit step-by-step instructions, and the skills / docs they must read. Partial context is never enough.
- **Models:** Default `inherit` unless the user names another Cursor-listed subagent model. Prefer a stronger listed model for code-writing subagents when the user asks; research-only agents may use a faster listed model and should still read the repo rather than answer from training.

#### Teams (research, design, critique)

For hard research questions, design tradeoffs, or critique passes, spawn a *team* of background agents in parallel, each with a distinct expert lens (e.g. security, performance, UX, `domain-backend`, sensitive-policy). Frame each lens role neutrally ("evaluate from a security perspective"), never the conclusion ("explain why X is right"). Synthesize in the parent: surface conflicts honestly, decide.

### Effect-TS

Any edit to a file that imports from `effect` or `@effect/*` is an Effect change: activate `domain-backend`, read `repos/effect-smol/LLMS.md` first, then the matching `docs/agent-patterns/` note (`effect-writing`, `effect-httpapi`, `effect-schema`, `effect-layers-services`, `effect-config`, `module-layout`, `repo-sql`, …). Prefer vendored Effect and those distillations over web search. Do not edit or import from `repos/`. Use catalog `effect` / `@effect/*` pins only (v4 beta — never Effect v3).

### Pull requests

Write the title and description for a tired reviewer who should know what the PR does in five seconds. See the `commit` skill for Conventional Commit subjects; keep PR bodies aligned with that honesty bar.

- Title: keep the `type(scope): summary` prefix, then a plain imperative phrase. No PR/issue numbers, slice counts like `(3/8)`, diff stats, or emoji.
- Description: lead with one sentence saying what changed and why. Bullets over paragraphs, one change each.
- Validation lists only commands and checks you actually ran.
- Cut filler openers ("This PR…"), invented numbers (file/diff counts — GitHub shows them), and AI tells ("comprehensive", "robust", "seamless").

### Verification

- Run `bun run ci` (`design:lint` + lint + `check:generated:portable` + typecheck + tests) before committing or pushing; never claim work complete without clean output.
- Scoped subsets: `bun run lint`, `bun run typecheck`, `bun run test`.
- Optional local gates (not required by portable `ci`): `bun run check:generated` (needs `.agent/`), `bun run arch:sentrux`, `bun run react:doctor`.
- Product safety: never auto-action sensitive mail; see `docs/agent-patterns/sensitive-policy.md`.
