---
description: Rebase current branch onto main with conflict resolution
---

# Rebase

Rebase the current branch onto the latest `main` using the `/domain-git` skill conflict resolution workflow.

## Step 1: Fetch and rebase

```bash
git fetch origin main
git rebase origin/main
```

If the rebase completes without conflicts, skip to Step 3.

## Step 2: Resolve conflicts

Follow the `/domain-git` conflict resolution workflow for every conflicting file. Read all three versions (target, yours, ancestor) before resolving. Follow the abort conditions and guardrails defined in the skill.

## Step 3: Verify

Run `bun run ci` to confirm the rebase did not break anything. If it fails, fix the issues before proceeding.

## Step 4: Push

If the branch has a remote tracking branch, ask the user for confirmation before force-pushing:

```bash
git push --force-with-lease
```

If no remote tracking branch exists, do not push.
