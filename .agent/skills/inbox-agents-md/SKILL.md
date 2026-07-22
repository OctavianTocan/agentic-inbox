---
name: inbox-agents-md
description: "Decides when to create or update nested AGENTS.md, README.md, and CLAUDE.md files in the agentic-inbox monorepo. Use when adding packages/apps/tools, restructuring subtrees, writing agent docs, or when nested subtree docs may be stale or missing."
---

# Agentic Inbox Nested AGENTS.md

Repo-wide defaults live in root `AGENTS.md` and `.agent/AGENTS.md` (portable brain). Nested `AGENTS.md` files are **deltas only** for subtrees with genuinely different operating rules.

Nearest file wins for work inside that subtree.

> Brain / root `AGENTS.md` / `CLAUDE.md` are **local-only** (gitignored after Step 1). Nested subtree docs under `apps/`, `packages/`, `tools/` may be committed when they help clones — prefer committing nested deltas that encode durable package rules; do not commit `.agent/`.

## When to create or add a nested file

Create `<subtree>/AGENTS.md` only when **at least one** applies:

| Signal | Example in this repo |
|--------|----------------------|
| Different commands | `apps/web`: Next `dev`/`build`; `apps/api`: `bun run dev:api`, migrations, Effect layers |
| Different stack | `apps/web` (Next 16 + design-system); `apps/api` (Effect v4 + `@effect/sql-pg`) |
| Stricter safety | Sensitive-email deferral; `tools/`: do not hand-edit generated output; secrets never committed; Postgres migrations |
| Different architecture | `packages/api-core` (schemas only) vs `apps/api` (runtime + repos) vs static `data/emails.json` |
| Root brain would repeat a long subtree-specific section | Prefer a short nested delta |

**Do not** create nested files for folders that only share repo-wide conventions (`packages/tooling`).

## When to update an existing nested file

Update `<subtree>/AGENTS.md` when your change introduces a **persistent** delta:

- New or renamed package scripts agents should run from that subtree
- New safety invariant (sensitive-email gate, migration rule, generated-artifact policy)
- New probe, deploy path, or architectural boundary agents keep violating
- Subtree ownership split (e.g. new module family under `apps/api/src/Modules`)

**Do not** update for:

- One-off task specs — put those in the user prompt or an issue/spec doc
- Rules already enforced by tooling — point to the config/command instead (`biome.json`, `bun run lint`, `.sentrux/rules.toml`)
- Duplicating `.agent/AGENTS.md`, `DOMAIN_KNOWLEDGE.md`, or an existing skill

## When to remove or skip

- Delete or avoid nested files that only restate root rules
- Merge away if a subtree lost its distinct commands/stack (fold notes into parent or `.agent/AGENTS.md`)
- Do not invent nested agent docs under optional `vendor/` checkouts

## Authoring workflow

1. **Check** root `AGENTS.md` index and existing nested files — extend before creating.
2. **Run the decision checklist** in [references/decision-checklist.md](references/decision-checklist.md).
3. **Create or update three files together** when adding a nested subtree (see [Subtree file set](#subtree-file-set)):
   - `AGENTS.md` — short agent delta
   - `README.md` — human runbook (see [references/readme-template.md](references/readme-template.md))
   - `CLAUDE.md` — exactly `@AGENTS.md` (one line, nothing else)
4. **Update root `AGENTS.md` index table** when adding, renaming, or removing a nested path.
5. **Do not** duplicate portable brain content — link to `.agent/AGENTS.md`, skills, or `docs/` instead.

## Subtree file set

Every path in the [current nested index](#current-nested-index-targets) should have:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent deltas: scope, commands, local rules, references |
| `README.md` | Runbook: run locally, day-to-day commands, entrypoints |
| `CLAUDE.md` | Pointer for Claude Code — content is only `@AGENTS.md` |

When **creating** a new nested subtree, add all three in the same change.

When **updating** an existing subtree:

- `AGENTS.md` — persistent agent/safety deltas
- `README.md` — persistent command/entrypoint/layout changes
- `CLAUDE.md` — only if missing; never expand beyond `@AGENTS.md`

When **removing** a nested subtree, delete all three and remove the root index row.

## Templates

### AGENTS.md

```md
# <path> — AGENTS.md

## Scope
One sentence: what this subtree owns.

## Commands
- Only commands that differ from repo root or need a local default.

## Local rules
- Subtree-specific invariants, safety gates, boundaries.
- No formatter/TS strictness restatement — cite tooling.

## References
- Skills, docs, or packages agents should read for depth.
```

### README.md

```md
# <Title> (`<path>`)

> Goal of this README: keep one up-to-date, high-signal guide to the current state of the repository, how to run it locally, and which commands and entrypoints matter day to day.

<One paragraph: what this subtree is.>

## Run locally
<Exact commands.>

## Day-to-day commands
<Table or list.>

## Layout / entrypoints
<Key files or modules.>

## Related
- `AGENTS.md`
- <siblings, skills, docs>
```

Full guidance: [references/readme-template.md](references/readme-template.md).

### CLAUDE.md

```md
@AGENTS.md
```

No other content. Do not symlink; use this literal one-line file.

## Good vs bad (agentic-inbox)

**Good** — `apps/api/AGENTS.md` documents Postgres migrate commands, `Repo.ts` placement, and “never auto-action sensitive mail”; does not repeat `bun run ci`.

**Bad** — `packages/api-core/AGENTS.md` that only says "use Effect v4 and run typecheck" (already in root / `.agent/AGENTS.md`).

**Good** — `tools/AGENTS.md` lists generate/check pairs and "do not hand-edit generated output."

**Good** — `apps/web/README.md` documents Next `dev`/`build` and `@/design-system` imports; `CLAUDE.md` is `@AGENTS.md` only.

**Bad** — Nested `AGENTS.md` without `README.md` when humans need local run commands.

**Bad** — `CLAUDE.md` that duplicates README or `.agent/AGENTS.md` content.

**Bad** — Nested file that copies Contract MCP/Turso/CLI rules into this repo.

## Current nested index (targets)

Maintain parity with root `AGENTS.md` when these exist:

- `apps/web/` — Next App Router, design-system, `@/` imports, BFF/in-process API routes
- `apps/api/` — Effect API, Postgres repos/migrations, `Main.ts` local listener, Web-handler export for Vercel (later steps)
- `packages/api-core/` — HTTP schemas / HttpApi contract (`@app/api-core`)
- `tools/` — generators (`skills|workflows|structure|openapi`:generate/check) — Step 2 creates this set

Optional later (only if a durable delta appears):

- `data/` — static sample emails only if agents keep inventing live-mail integrations

## Related skills

| Skill | Use when |
|-------|----------|
| `domain-design` | Visual / product UI rules |
| `domain-frontend` | React/Next implementation |
| `domain-backend` | api-core / apps/api / Postgres module layout |
| `generated-repo-surfaces` | Generator outputs under `tools/` |
| `skillforge` | Creating this pattern elsewhere |

## Self-rewrite hook

After creating or removing nested `AGENTS.md` files, or when agents repeatedly miss subtree rules:

1. Check whether the gap belongs in a **skill** (workflow/procedure) vs **nested AGENTS.md** (stable subtree delta).
2. If nested files keep duplicating root content, tighten this skill's "skip" examples.
3. Update root `AGENTS.md` index and this skill's "Current nested index" together.
4. Verify each indexed path still has `AGENTS.md`, `README.md`, and `CLAUDE.md` (`@AGENTS.md` only).
