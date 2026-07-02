# Changelog

## 1.1.0
- Publishing is now mandatory: every skill is created as its own standalone repo on the user's GitHub account (GITHUB_OWNER), every time, instead of being an opt-in/ask-first step.
- Added a "Clean it up on GitHub" step to `cookbook/publish-repo.md`: clean working tree, only intended files tracked (no cruft/nested `.git`/leftover `TODO:`), repo description set, and verified public install.
- Added `GITHUB_OWNER` and `REPO_VISIBILITY` variables.

## 1.0.0
- Initial release of create-skill.
