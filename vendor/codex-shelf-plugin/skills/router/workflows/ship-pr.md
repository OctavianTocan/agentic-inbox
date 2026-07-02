---
name: ship-pr
description: Take a finished branch through review and merge — request review, address feedback, finish the branch.
when_to_use: Implementation is done on a branch and you want it reviewed and merged cleanly.
---

# ship-pr

The closing leg of a change: get eyes on the diff, fold in the feedback, and land
the branch. Pairs naturally after `feature-build` or `bug-fix`.

## Steps

1. **`superpowers:requesting-code-review`** — Package the diff and request a focused review.
   - Handoff: When review comments arrive, work through them deliberately.
2. **`superpowers:receiving-code-review`** — Address each comment, pushing back where warranted rather than blindly complying.
   - Handoff: Once feedback is resolved and checks are green, finish the branch.
3. **`superpowers:finishing-a-development-branch`** — Merge/clean up the branch and close out the work.

## Notes

- If review surfaces a real bug, branch into the `bug-fix` workflow before merging.
