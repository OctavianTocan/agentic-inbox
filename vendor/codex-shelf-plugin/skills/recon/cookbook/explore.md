# Run a reconnaissance pass

## Context
Build verified, section-by-section understanding of a project before creating or
modifying anything in it. Dispatches a read-only subagent **workflow** that maps
conventions, docs, in-project skills, and the focus subsystem — then synthesizes
one understanding plus the open questions that remain.

## Input
- Optional **focus**: what you are about to build/change (a task description or a
  subsystem). Sharpens the deep-dive; omit for a general orientation.
- Optional **path**: the project dir (defaults to the current working directory).
- Optional **RECON_ARTIFACT_DIR**: environment variable to override where the
  synthesis artifact is written (default: `$HOME/.claude/recon/`).

## Steps

### 1. Build the manifest
Run the deterministic survey. It resolves the project root (git toplevel), finds
the docs / in-project skills / config / structure, and proposes the `sections` to
divide among subagents:
```bash
python3 "$HOME/.claude/skills/recon/scripts/survey.py" --focus "<what you're about to do>"
# omit --focus for a general pass; add --path <dir> for a different project
```
The script resolves its own location via `__file__`, so the same command works
no matter where the skill is installed. If you installed it elsewhere, replace
`$HOME/.claude/skills/recon/` with that path.

Capture the JSON it prints — that is the `manifest`.

### 2. Confirm scope
Show the user, briefly: the project root, the section list (and any
`omitted_code_areas` — say what is being skipped), and the focus. This is a
read-only pass; no files are modified. Proceed unless they narrow it.

### 3. Dispatch the recon workflow
Invoke the **Workflow** tool with the bundled script template, passing the
manifest and focus as `args`. (This skill's instructions authorize the Workflow
call — that is the required opt-in.)

- `scriptPath`: `$HOME/.claude/skills/recon/references/workflow-template.js`
- `args`: `{ "manifest": <the survey JSON>, "focus": "<focus or null>" }`

The workflow fans out one **read-only `Explore` subagent per section** (each must
cite `path:line` and list `unknowns`, never guess), then a synthesis agent merges
everything into one understanding with all unknowns rolled up into
`open_questions`. See [../references/sections.md](../references/sections.md) for the
discipline each subagent follows.

If the user has not opted into multi-agent orchestration and the Workflow tool is
unavailable, fall back to dispatching the same per-section prompts as individual
read-only `Explore` agents via the Agent tool, then synthesize yourself — but the
workflow is the intended path.

### 4. Persist the artifact
Write the synthesis to the manifest's `artifact_path`
(`$HOME/.claude/recon/<project-slug>/<focus-or-overview>.md` by default) as
readable markdown: overview, conventions (with evidence), architecture,
commands, skills to follow, focus guidance, and an **Open questions** section.
Create the parent dir first. This lives under the user's home — it never touches
the target repo.

### 5. Surface the summary
In the conversation, give the user:
- A tight orientation (overview + the few conventions that matter most for their work).
- **Skills to follow** — the in-project skills they should activate.
- **Focus guidance** — how to approach their task within these conventions.
- **Open questions** — state these prominently. This is what recon could NOT
  verify; do not bury it. Offer to deep-dive any of them before building.
- Confidence level and where the artifact was written.

## Anti-patterns
- Do not let the summary imply full understanding when `open_questions` is
  non-empty — name the gaps.
- Do not edit any project file during recon; it is comprehension only.
- Do not skip the survey and hand subagents a vague "explore the repo" — divide
  by the manifest's sections so coverage is complete and parallel.

## Done
Tell the user:
- Project + focus reconnoitred, sections covered (and any omitted).
- Where the artifact was written.
- The open questions that remain, and an offer to resolve them or proceed to the work.
