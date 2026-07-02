# Changelog

## 1.0.0
- Initial release of `router`.
- `SKILL.md`: commands, arguments, install-relative variables, cookbook routing, references.
- `cookbook/setup.md`: one-time DB init + idempotent PostToolUse hook install.
- `cookbook/stats.md`: most-used skills, all-time or within a recent window.
- `cookbook/pick.md`: candidate shortlist for a free-text request; agent + user make the final pick.
- `cookbook/workflows.md`: list, run, and define multi-skill workflows.
- `references/schema.md`: DB schema, hook mechanics, ranking formula, workflow file format.
- `scripts/router.py`: stdlib-only CLI with subcommands `init`, `record`, `catalog`, `stats`, `rank`, `workflows`, `install-hook`. Resolves its own install location via `__file__`; `install-hook` embeds the absolute path to the script so the hook works at any install path.
- `workflows/bug-fix.md`: systematic-debugging → tdd → verification-before-completion.
- `workflows/feature-build.md`: brainstorming → writing-plans → executing-plans → verification-before-completion.
- `workflows/ship-pr.md`: requesting-code-review → receiving-code-review → finishing-a-development-branch.
- `data/.gitkeep`: local usage DB lives here and is gitignored.
- Hardcoded paths in original authoring replaced with install-relative references throughout.
