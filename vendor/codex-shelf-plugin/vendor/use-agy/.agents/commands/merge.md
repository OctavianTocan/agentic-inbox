---
description: Wait for CI to pass then merge the current PR
---

# Merge

Wait for all CI checks to pass on the current PR, then merge it.

## Step 1: Find the PR

```bash
gh pr view --json number,url,state,title,headRefName
```

If no PR exists, stop and tell the user to create one first (e.g. via `/pr`).

If the PR is already merged or closed, jump to Step 4 (babysit cleanup) and then inform the user the PR was already merged/closed. The cron started by `/pr` must still be stopped even on this early exit.

## Step 2: Wait for CI

```bash
gh pr checks <number> --watch --fail-fast
```

If checks fail, print the failing check names and stop.

## Step 3: Merge

```bash
gh pr merge <number> --squash --delete-branch
```

Print the merged PR URL and confirm the branch was deleted. Then proceed to Step 4.

## Step 4: Stop the babysit loop

`/pr` may start a recurring `/babysit` cron (see `.agents/commands/pr.md` Step 7) that will keep firing against the now-merged PR otherwise. End the lifecycle cleanly when cron tools are available:

1. If the host supports cron tools, call `CronList` to list scheduled jobs.
2. For every recurring job whose `prompt` is `/babysit`, call `CronDelete` with that job's ID.

If no such jobs exist, or the host has no cron tool, this is a no-op.
