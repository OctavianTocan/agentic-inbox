# README template for nested subtrees

Use when creating `<subtree>/README.md` alongside a new or restored `AGENTS.md`.

## Required header

```md
# <Human title> (`<path>`)

> Goal of this README: keep one up-to-date, high-signal guide to the current state of the repository, how to run it locally, and which commands and entrypoints matter day to day.
```

## Required first paragraph shape

> This is **X**. It does **Y**. It does **not** do **Z**.

## Suggested sections

1. One paragraph — what this subtree owns
2. **Run locally** — exact commands
3. **Day-to-day commands** — table
4. **Layout / entrypoints** — key files
5. **Related** — `AGENTS.md`, skills, siblings

## Division of labor

| File | Audience | Content |
|------|----------|---------|
| `README.md` | Humans + agents needing runbook | How to run, commands, entrypoints, layout |
| `AGENTS.md` | Agents | Deltas: safety, boundaries, local rules |
| `CLAUDE.md` | Claude Code | Single line: `@AGENTS.md` |

Do not copy `AGENTS.md` local rules into README — cross-link instead.  
Do not put agent-only safety gates only in README — they belong in `AGENTS.md`.
