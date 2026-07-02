# Pull Request Conventions

This file owns the structure. For how to write the title and sections so they
read short and human, see the guidance in this skill's references and `AGENTS.md`.

## Required Body Sections

Always include:

- `## Context`
- `## What Changed`
- `## Validation`
- `## Risks & Rollback`

Include `## External Changelog` only when external release notes are needed.

## Template

```markdown
## Context
Why this change exists.

## What Changed
- Key implementation changes.

## Validation
- Commands run
- Manual checks performed

## Risks & Rollback
- Main risks
- Rollback approach

## External Changelog
{CHANGELOG}: <customer-facing change summary>
{CHANGELOG}: <second customer-facing summary if needed>
```

If no external changelog is needed, omit the entire `## External Changelog` section (including heading).

## {CHANGELOG} Line Format

The `{CHANGELOG}: ...` lines are machine-parseable metadata for future CI automation.

Rules:

- External/customer-facing only
- No internal implementation details, secrets, or incident context
- Prefer one user-visible change per line

## Ready-By-Default Flow

```bash
git push -u origin <branch>
gh pr create --title "<title>" --body-file /tmp/PR_BODY.md --base main
gh pr edit --body-file /tmp/PR_BODY.md
```

Create a draft PR only when the user explicitly asks for draft/WIP,
validation has not run, validation failed, or the work is intentionally
incomplete. Explain the draft reason in the final summary.

## Review Readiness Checklist

- `bun run ci` passed locally or in CI
- PR body includes validation evidence
- If `## External Changelog` exists, `{CHANGELOG}: ...` line(s) are externally safe
- Risks and rollback are documented
