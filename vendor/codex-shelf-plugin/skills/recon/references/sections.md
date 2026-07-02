# recon coverage & discipline

What a reconnaissance pass must cover, and the rules every subagent follows.

## The no-assumptions rule

Recon exists to replace guessing with verified knowledge. Every subagent and the
synthesis obey the same discipline:

1. **Read the actual files.** Never report a convention you have not seen in
   source or docs.
2. **Cite evidence.** Every convention and fact carries a `path` or `path:line`.
3. **Surface unknowns, never fill them.** Anything unclear or unverified goes to
   `unknowns` (rolled up into `open_questions`). A gap stated honestly beats a
   plausible guess.
4. **Stay in your section.** Exhaustive within scope; no straying.

If a claim cannot be backed by a file, it is an open question — not a finding.

## Sections every pass should cover

`survey.py` derives these from the project automatically; this is the intent
behind each:

| Section          | What to extract                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Entry docs       | README, AGENTS.md, CLAUDE.md, GEMINI.md, CONTEXT(.md/-MAP), CONTRIBUTING, ADRs — read **in full**. Every stated rule, command, and constraint. |
| In-project skills| Each `.claude/skills/*/SKILL.md` (and `.agents/skills`) — what it governs and when it MUST be used, especially any relevant to the focus. |
| Build/test/lint/CI | package.json scripts, tsconfig, biome/eslint/prettier, pyproject/ruff, lefthook, `.github/workflows` — the rules they *enforce* and the exact commands to build/test/lint/run. |
| Structure        | Top-level layout, package/app boundaries, where domain logic lives, how modules depend on each other. |
| Code areas       | Per workspace/source area: conventions **actually in use** — naming, imports, error handling, test layout, types — verified against real code, not just the docs. |
| Focus deep-dive  | The specific subsystem the upcoming task touches: how work like it is done here, with citations, and every blocking unknown. |

## What the synthesis produces

- **overview** — a short orientation.
- **conventions** — deduplicated, evidence preserved.
- **architecture** — structure + boundaries, cited.
- **commands** — how to build/test/lint/run.
- **skills_to_follow** — in-project skills to activate for the work.
- **focus_guidance** — convention-grounded approach to the focus task.
- **open_questions** — everything still unverified (all section unknowns rolled up).
- **confidence** — honest, based on coverage and remaining open questions.

`open_questions` is the most important output: it tells you exactly where your
understanding is still thin before you start building.
