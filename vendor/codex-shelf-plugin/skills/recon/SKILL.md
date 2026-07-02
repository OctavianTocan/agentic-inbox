---
name: recon
description: "Build verified, section-by-section understanding of a project BEFORE creating or modifying anything in it. Dispatches a read-only subagent workflow that maps every convention, reads README/AGENTS.md/CLAUDE.md and the docs in full, finds and reads relevant in-project skills, surveys structure and build/test/CI, and explores the focus subsystem \u2014 with no assumptions allowed. Use when starting work in an unfamiliar repo or subsystem, onboarding to a codebase, before any non-trivial change, or when the user says \"understand this project\", \"explore the codebase\", \"learn the conventions\", \"recon\", \"get oriented\", or \"what are the conventions here\"."
metadata:
  tavi_toolbelt_original_frontmatter:
    argument-hint: '[focus: what you''re about to build/change] (omit for a general orientation)'
---

# recon

**Use this BEFORE building in a project you do not fully understand.** Recon
replaces guessing with verified knowledge: it dispatches a read-only subagent
workflow that explores a project section-by-section — conventions, entry docs,
in-project skills, structure, build/test/CI, and the subsystem you are about to
touch — and synthesizes one understanding plus the **open questions** that remain.

Its discipline is **no assumptions**: every convention and fact carries a
`path:line` citation, and anything unverified is reported as an open question
rather than guessed. The point is to build understanding before creating
something specific.

## When to use

- Starting work in an unfamiliar repo or subsystem, or onboarding to a codebase.
- Before any non-trivial change where you are not already certain of the project's
  conventions, layout, and the in-project skills that govern the work.
- When the user asks to understand / explore / learn a project's conventions.

When NOT to use: trivial edits in a project you already understand, or a pure
factual lookup (read the file directly).

## Arguments

Invoke as **`/recon [focus]`**. The text after `/recon` is the **focus** — what you
are about to build or change (a task or a subsystem). It sharpens the deep-dive and
the synthesis. Omit it for a general orientation. The pass always covers the whole
project's conventions broadly and goes deep on the focus.

## How It Works

1. A deterministic survey (`scripts/survey.py`) maps the project and proposes the
   sections to divide among subagents.
2. The skill dispatches a **Workflow** that fans out one read-only `Explore`
   subagent per section (each cites evidence, lists unknowns, never guesses), then
   synthesizes the findings into one understanding with all unknowns rolled up.
3. The understanding is written to a scratch artifact under
   `$HOME/.claude/recon/<project-slug>/<focus-or-overview>.md` (override with
   `RECON_ARTIFACT_DIR`; the survey script's `manifest.artifact_path` reflects the
   actual location). It is keyed by project path — persistent across sessions,
   never committed to the target repo.

## Variables

- **ARTIFACT_DIR**: `$HOME/.claude/recon/` by default (override with `RECON_ARTIFACT_DIR`).
- **SCRIPTS_DIR**: the skill's own `scripts/` dir; `survey.py` resolves itself
  relative to the install location, so commands work from any install path.

## Commands

| Command          | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `/recon [focus]` | Reconnoitre the project (optionally focused on an upcoming task)        |

## Cookbook

**Read the cookbook file before executing.**

| Operation | Cookbook                                   | Use When                                              |
| --------- | ------------------------------------------ | ----------------------------------------------------- |
| explore   | [cookbook/explore.md](cookbook/explore.md) | Any `/recon` invocation — the full reconnaissance pass |

**When the user invokes `/recon`, read `cookbook/explore.md` first, then execute it.**

## Reference

- [references/sections.md](references/sections.md) — coverage checklist + the no-assumptions discipline.
- [references/workflow-template.js](references/workflow-template.js) — the Workflow script the pass dispatches.

## Notes

- Read-only by design: recon never modifies a project file. It builds
  understanding; it does not act on it.
- The artifact lives under `$HOME/.claude/recon/` by default — keyed by project
  path, persistent across sessions, never committed to the target repo.
- `open_questions` in the output is the deliverable that matters most: it names
  exactly where understanding is still thin before you start building.
