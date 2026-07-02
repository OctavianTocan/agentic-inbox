---
description: Create a commit following project conventions
---

# Commit

Create a single commit using the `/domain-git` skill conventions.

## Step 1: Read the diff

```bash
git diff --stat
git diff
git diff --cached --stat
git diff --cached
```

If there are no changes (staged or unstaged), stop and tell the user there is nothing to commit.

## Step 2: Stage changes

If there are unstaged changes, stage the relevant files. Prefer `git add <file>...` over `git add -A`. Do not stage files that look like secrets (`.env`, credentials, tokens).

## Step 3: Commit

Craft the commit message following `/domain-git` commit conventions. Use a heredoc:

```bash
git commit -m "$(cat <<'EOF'
type(scope): summary line

Optional body.
EOF
)"
```

Do not use `--no-verify`. If a pre-commit hook fails, fix the issue and create a new commit.

## Step 4: Confirm

Print the commit hash and summary. Do not push unless the user asks.
