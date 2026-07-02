---
description: Push branch and create or update a pull request
---

# Pull Request

Push the current branch and open (or update) a pull request using the `/domain-git` skill PR conventions.

## Step 1: Gather context

Always compare against the remote base, not local `main`:

```bash
git fetch origin main
git log origin/main..HEAD --oneline
git diff origin/main...HEAD --stat
```

If there are no commits ahead of `origin/main`, stop and tell the user there is nothing to open a PR for.

Check for uncommitted changes. If any exist, ask the user whether to commit first.

## Step 2: Verify

Run `bun run ci` to confirm everything passes before pushing. If it fails, fix the issues first.

## Step 3: Push the branch

```bash
git push -u origin HEAD
```

## Step 4: Check for existing PR

```bash
gh pr view --json number,url 2>/dev/null
```

If a PR already exists, go to Step 6 (update). Otherwise, continue to Step 5 (create).

## Step 5: Create a new PR

Write the title and body following `/domain-git` PR conventions. Write the body to a temp file for multi-section templates.

```bash
gh pr create --draft --title "<title>" --body-file /tmp/PR_BODY.md --base main
gh pr ready
```

Print the PR URL, then proceed to Step 7 (skip Step 6).

## Step 6: Update an existing PR

Read the current PR body and new commits. Update the title and body to reflect the current state of the branch. Derive the base ref from the PR and compare against `origin/<baseRefName>`.

```bash
gh pr view --json body --jq '.body'
BASE_REF=$(gh pr view --json baseRefName --jq '.baseRefName')
git fetch origin "$BASE_REF"
git log --oneline "origin/$BASE_REF"..HEAD
gh pr edit --title "<title>" --body-file /tmp/PR_BODY.md
```

Print the PR URL, then proceed to Step 7.

## Step 7: Start the babysit loop

After the PR URL is printed (new or updated), kick off a fixed-interval babysit loop so every round of review comments and CI failures is handled automatically.

If the host supports cron tools (e.g. `CronCreate`), start a fixed-interval babysit loop with `/loop 5m /babysit`. Otherwise, print the PR URL and run `/babysit` manually when checks or reviews change.

**Cancel any prior babysit loop first** so repeated `/pr` invocations don't accumulate duplicate loops:

1. If cron tools exist, call `CronList` to list scheduled jobs.
2. For every recurring job whose `prompt` is `/babysit`, call `CronDelete` with that job's ID.

Then invoke the host's loop mechanism with `5m /babysit`. Use `5m` unless the user specified a different cadence in their `/pr` arguments; if they did, use theirs (e.g. `/loop 2m /babysit`, `/loop 10m /babysit`). Skip this step when the host has no cron/loop tool.

Each tick re-runs `/babysit`, which fetches new review threads, review bodies, conversation comments, and CI status, fixes what's actionable, pushes, and resolves addressed threads. The loop keeps firing on the interval so **subsequent rounds** of feedback (follow-up comments after fixes, new reviewers, re-reviews triggered by fresh commits) are picked up without re-invoking `/pr`.

The loop stops in any of these ways:
- `/babysit` self-terminates whenever it detects the PR is merged, closed, or missing, and deletes its own cron when cron tools are available. This covers external merges, external closures, and branch deletion.
- Running `/merge` explicitly calls the same cleanup on its way out.
- You can stop it manually at any time by deleting the babysit job in the host's cron tool, e.g. to put the PR on hold.
- As a final safety net, recurring cron jobs auto-expire after 7 days.
