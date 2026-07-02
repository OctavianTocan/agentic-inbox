---
name: workflow-finish
description: "Use when implementation on a branch is complete and you need to ship it."
---

# Finishing a Development Branch

Use when implementation is complete and you need to ship a PR. The repo's slash commands already implement every step; this skill just orders them.

## Process

Finish statefully; do not blindly merge after one babysit pass:

1. `/pr` — push the branch and open or update the pull request.
2. `/babysit` — handle actionable review comments and CI failures. Repeat until CI is green, actionable feedback is handled, and the PR is approved or explicitly cleared to merge.
3. `/merge` — merge only after the PR is green and mergeable.

See `domain-git` for commit, rebase, and push conventions.
