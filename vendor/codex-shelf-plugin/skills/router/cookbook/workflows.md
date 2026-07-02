# List, run, and define skill workflows

## Context
Workflows are ordered skill sequences with handoffs — the way superpowers chains
brainstorming → writing-plans → executing-plans. They live as markdown files
under `workflows/`, one per workflow. This cookbook covers listing, running, and
authoring them.

The default install location is `$HOME/.claude/skills/router/`. If you installed
the skill elsewhere, swap that path into the commands below.

## List

```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" workflows --text
```
Drop `--text` for JSON (`{count, workflows:[{name,description,when_to_use,steps,path}]}`).
Present each with its description and step count. If the user's task matches a
workflow's `when_to_use`, suggest it.

## Run

1. **Read the definition.** Open the chosen workflow file (`workflows/<name>.md`)
   with the Read tool. The frontmatter gives `name`/`description`/`when_to_use`;
   the `## Steps` section gives the ordered skills, each with a purpose and a
   handoff note.
2. **Confirm scope.** Restate the sequence to the user and confirm before
   starting. Note any step the workflow says is skippable for their situation.
3. **Walk the steps in order.** For each step:
   - Announce: `Step N/total — invoking <skill> to <purpose>`.
   - Invoke that skill with the `Skill` tool, carrying forward the previous
     step's output as context.
   - At the **handoff**, pause: summarize what the step produced and what feeds
     the next step. Honor each skill's own stopping points (e.g. brainstorming
     and planning expect user sign-off before moving on) — do not bulldoze
     through review checkpoints.
4. **Stop conditions.** If a skill says it cannot proceed (e.g. a bug can't be
   reproduced), stop the workflow there and report — do not skip ahead.

## Define a new workflow

Create `workflows/<name>.md` mirroring the existing files:
```markdown
---
name: <kebab-case-name>
description: <one line — what the chain accomplishes>
when_to_use: <the situation that should trigger this workflow>
---

# <name>

<1–2 sentences on how the steps hand off to each other.>

## Steps

1. **`<skill-name>`** — <what this step does>.
   - Handoff: <what feeds the next step>.
2. **`<skill-name>`** — <what this step does>.
```
Rules:
- Reference skills by their exact invocation name (e.g. `superpowers:brainstorming`).
- Number steps with `N.` so the `workflows` command can count them.
- Keep the chain to skills that are actually installed — verify against the live
  skill list before saving.

## Done
Tell the user:
- For list: the available workflows and which fits their task.
- For run: which workflow ran, the steps completed, and where it stopped.
- For define: the new file path and that it now appears in `workflows`.
