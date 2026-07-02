---
description: Monitor a PR, fix review comments and CI failures
argument-hint: "[PR number]"
---

# Babysit

Check a pull request for CI failures and unresolved review comments, then fix them.

## Step 1: Identify the PR and verify it is still open

Resolve the PR number: use the argument if one was provided, otherwise detect from the current branch. Then, **on both paths**, fetch the state so self-termination can run regardless of how the number was obtained:

```bash
# With an argument:
gh pr view <number> --json number,url,state --jq '{number, state}'

# Without an argument (current branch):
gh pr view --json number,url,state --jq '{number, state}'
```

If no PR is found, or the PR `state` is `MERGED` or `CLOSED`, the lifecycle is over. If the host supports cron tools, self-terminate any recurring `/babysit` cron by calling `CronList`, then `CronDelete` every recurring job whose `prompt` is `/babysit`. Print a short status (e.g. `PR #<n> is merged/closed, babysit loop stopped.` or `No PR, nothing to babysit.`) and stop.

Store the owner and repo:

```bash
gh repo view --json owner,name --jq '[.owner.login, .name] | join("/")'
```

## Step 2: Gather issues

Run in parallel:

### 2a: Check CI status

```bash
gh pr checks <number> --json name,state,link
```

If checks are `PENDING`, wait: `gh pr checks <number> --watch --fail-fast`. For failed checks, include enough fields to find logs:

```bash
gh pr checks <number> --json name,state,link,bucket,workflow
```

For GitHub Actions checks, extract the run id from the `link` URL and run `gh run view <run-id> --log-failed`. If the check is external or the link does not contain an Actions run id, report the check name and link instead of inventing one.

### 2b: Fetch review threads, review bodies, and PR comments

```bash
gh api graphql -f owner='<owner>' -f repo='<repo>' -F number=<number> -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        author { login }
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 10) {
              nodes {
                body
                path
                line
                author { login }
              }
            }
          }
        }
        reviews(first: 50) {
          nodes {
            body
            state
            author { login }
            submittedAt
          }
        }
        comments(first: 100) {
          nodes {
            body
            author { login }
            createdAt
          }
        }
      }
    }
  }
'
```

Filter to actionable feedback:
- **Review threads:** unresolved threads only
- **Review bodies:** reviews with state `CHANGES_REQUESTED` or `COMMENTED` that have a non-empty body — these contain top-level review feedback that is not part of any inline thread
- **Conversation comments:** comments from users other than the PR author — these may contain actionable feedback not captured in review threads

## Step 3: Evaluate

If CI is green and there are no unresolved review comments, print "PR is clean, nothing to do." and stop.

Otherwise, compile a summary of all issues.

## Step 4: Plan fixes

Fetch the PR base and compare against the remote base:

```bash
BASE_REF=$(gh pr view <number> --json baseRefName --jq '.baseRefName')
git fetch origin "$BASE_REF"
git diff "origin/$BASE_REF"...HEAD
```

Spawn a read-only planning subagent with the issue summary and remote-base diff. Use `subagent_type` (`Explore`/`Plan`) per `AGENTS.md` > Subagents. If model selection is available, use a research-tier model per `AGENTS.md` > Subagents. Instruct it to activate the relevant domain skills for the touched files and return a concrete fix plan — what file to change, what the change is, and why.

## Step 5: Execute fixes

Spawn a code-writing subagent only when the fixes are non-trivial and can be given clear file ownership. If model selection is available, use the code-writing model tier defined in `AGENTS.md` > Subagents. Instruct it to activate the relevant domain skills for the files being changed:

1. Implement each planned change
2. Run `bun run ci` to verify
3. If CI fails, fix the issue (up to 3 attempts)
4. Create a new commit following `/domain-git` commit conventions
5. Push: `git push`

## Step 6: Resolve threads

For each thread that is fixed OR a verified false positive, resolve it:

```bash
gh api graphql -f threadId='<thread-id>' -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }
'
```

- **Fixed**: code now reflects the feedback.
- **False positive**: verify the invariant the bot missed (type, plugin contract, schema constraint) before resolving. If unsure, leave open.

Conversation comments and review bodies cannot be programmatically resolved.
