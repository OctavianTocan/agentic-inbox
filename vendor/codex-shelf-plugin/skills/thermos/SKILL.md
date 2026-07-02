---
name: thermos
description: "Launch both thermo-nuclear review subagents in parallel, then synthesize their findings. Use for thermos, double thermo review, or combined bug/security and code-quality branch audits."
---

# Thermos

Run the two thermo review passes as parallel background subagents, then synthesize their results into a single verdict.

## Workflow

1. Determine the review scope from the user request, PR, current branch, or relevant changed files. The default base is `main` — confirm the base branch if it is ambiguous.
2. Gather the evidence reviewers need so they never have to guess:
   - The diff: `git diff <base>...HEAD` (default `git diff main...HEAD`).
   - The full contents of the changed files. Read them directly, or dispatch an `Explore` subagent to collect them for large branches.
3. Launch **both** review subagents in the **same message** with `run_in_background: true`, passing each the same scoped context under labeled sections (`### Git / diff output` and `### Changed file contents`):
   - `thermo-nuclear-review-subagent` (namespaced `thermos:thermo-nuclear-review-subagent`) — bugs, breaking changes, security, devex regressions, feature-flag leaks, and other branch-audit risks.
   - `thermo-nuclear-code-quality-review-subagent` (namespaced `thermos:thermo-nuclear-code-quality-review-subagent`) — maintainability, structure, file-size growth, spaghetti, abstractions, and codebase-health risks.
   Ask each to return prioritized findings with `file:line` references and evidence.
4. After both finish, synthesize the results with findings first, deduplicated across reviewers. Weight overlapping findings more heavily, resolve disagreements with your own judgment, and keep summaries brief.

If the individual background summaries are already visible to the user, do not restate them wholesale. Surface the unified verdict, the highest-signal findings, and any remaining uncertainty.
