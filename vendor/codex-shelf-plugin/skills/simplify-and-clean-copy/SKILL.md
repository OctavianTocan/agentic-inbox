---
name: simplify-and-clean-copy
description: Simplify recently modified code for clarity, then reimplement the branch with a clean narrative commit history. Use when asked to "simplify and clean copy", "polish and clean", or when preparing a branch for review-ready PR.
---

# Simplify & Clean Copy

Two-phase workflow that first refines code for clarity, then reimplements the
branch with a clean, narrative-quality commit history.

## Phase 1: Simplify

Run the `code-simplifier` agent on all files modified in the current branch.

1. Get the list of modified files:
   ```bash
   git diff --name-only main...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.css'
   ```
2. Launch a `code-simplifier` agent targeting those files. The agent should:
   - Simplify and refine code for clarity, consistency, and maintainability
   - Preserve all functionality — no behavior changes
   - Focus on the diff (recently modified code), not surrounding untouched code
3. Review the simplification changes — verify no behavior changes were introduced.
4. Run the project formatter and type checker.
5. Commit simplification changes:
   ```
   style: simplify recently modified code
   ```
6. Push the commit to the source branch.

## Phase 2: Clean Copy

Invoke the `/clean-copy` skill to reimplement the branch with a clean commit
history. Pass through any NEW_BRANCH argument the user provided.

## Rules

- Phase 1 changes must be committed and pushed BEFORE starting Phase 2.
- Phase 2 uses the updated source branch (with simplification) as its source.
- If Phase 1 produces no changes, skip the commit and proceed directly to Phase 2.
