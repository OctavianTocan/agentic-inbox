# recon

> A skill for AI agents that builds **verified, no-assumptions understanding** of a project before creating or modifying anything in it.

---

## What It Does

`recon` replaces guessing with verified knowledge. It dispatches a **read-only** subagent workflow that explores a project section-by-section — conventions, entry docs, in-project skills, structure, build/test/CI, and the subsystem you are about to touch — and synthesizes one understanding plus the **open questions** that remain.

The discipline is **no assumptions**:

1. **Read the actual files.** Never report a convention you have not seen in source or docs.
2. **Cite evidence.** Every convention and fact carries a `path:line` citation.
3. **Surface unknowns, never fill them.** Anything unclear goes to `open_questions` — a gap stated honestly beats a plausible guess.
4. **Stay in your section.** Exhaustive within scope; no straying.

`open_questions` is the deliverable that matters most: it names exactly where understanding is still thin before you start building.

---

## When to Use It

- Starting work in an unfamiliar repo or subsystem, or onboarding to a codebase.
- Before any non-trivial change where you are not already certain of the project's conventions, layout, and the in-project skills that govern the work.
- When the user asks to "understand / explore / learn" a project's conventions, says "recon", "explore the codebase", "get oriented", or "what are the conventions here".

Not for trivial edits in a project you already understand, or for a pure factual lookup (read the file directly).

---

## Skill Architecture

Progressive disclosure: a lean `SKILL.md` routes to a per-operation cookbook file, which pulls in references and a deterministic survey script on demand.

```
recon/
├── SKILL.md                       # routing doc (read on trigger)
├── cookbook/
│   └── explore.md                 # the full reconnaissance pass
├── references/
│   ├── sections.md                # coverage checklist + no-assumptions discipline
│   └── workflow-template.js       # the Workflow script the pass dispatches
└── scripts/
    └── survey.py                  # deterministic manifest builder (stdlib only)
```

---

## How It Works

1. A deterministic survey (`scripts/survey.py`) maps the project and proposes the sections to divide among subagents.
2. The skill dispatches a **Workflow** that fans out one read-only `Explore` subagent per section (each cites evidence, lists unknowns, never guesses), then synthesizes the findings into one understanding with all unknowns rolled up.
3. The understanding is written to a scratch artifact under `$HOME/.claude/recon/<project-slug>/<focus-or-overview>.md` (override with `RECON_ARTIFACT_DIR`) — persistent across sessions, never committed to the target repo.

---

## Commands

| Command          | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `/recon [focus]` | Reconnoitre the project (optionally focused on an upcoming task)        |

`focus` is the task or subsystem you are about to build/change. It sharpens the deep-dive and the synthesis. Omit it for a general orientation.

---

## Installation

Install with Vercel's Skills CLI (recommended):

```bash
npx skills add OctavianTocan/recon
```

Or copy the directory into your agent's skills folder:

```bash
# Claude Code — personal (default)
cp -r recon ~/.claude/skills/

# Available to all local agents
cp -r recon ~/.agents/skills/
```

The skill reads `scripts/survey.py` and `references/workflow-template.js` from the install path; the cookbook assumes the default install location (`$HOME/.claude/skills/recon/`) and notes the substitution if you installed elsewhere.

---

## Usage

```text
/recon                              # general orientation of the current project
/recon add a settings page          # deep-dive focused on an upcoming feature
/recon fix the flaky test in CI     # deep-dive focused on a known subsystem
```

The agent reads `SKILL.md`, opens `cookbook/explore.md`, and follows the steps — running the survey, dispatching the workflow, persisting the synthesis under `$HOME/.claude/recon/`, and surfacing the open questions prominently.

---

## Scope

Recon is **read-only by design**: it builds understanding, it does not act on it. Never edits a project file. The artifact is the deliverable; `open_questions` is the most important part of it.

---

## License

MIT
