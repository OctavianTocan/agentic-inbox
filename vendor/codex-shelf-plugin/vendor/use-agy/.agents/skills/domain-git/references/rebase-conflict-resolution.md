# Rebase Conflict Semantics

## Ours/Theirs During Rebase

During `git rebase main`, git's terminology is **swapped** from merge semantics. Git first checks out the target branch, then replays your commits on top — so HEAD is the target, not your branch.

| Term | During merge | During rebase |
|------|-------------|---------------|
| **HEAD / ours** | Your branch | Target branch (main) |
| **theirs** | Other branch | Your commits being replayed |

## Reading Conflict Markers

```
<<<<<<< HEAD
[TARGET branch version (main)]
=======
[YOUR branch version (commit being replayed)]
>>>>>>> abc1234 (your commit message)
```

The commit hash/message at the bottom identifies YOUR commit.

## Delete vs Modify Conflicts

| Message | Meaning during rebase |
|---------|-----------------------|
| "deleted by us" | Target branch (main) deleted the file |
| "deleted by them" | Your feature branch deleted the file |

## Verification Commands

```bash
git show HEAD:<file>                                # rebase-in-progress tip (target + replayed commits)
git show origin/main:<file>                         # pristine target branch
git show ORIG_HEAD:<file>                           # your branch
git show $(git merge-base HEAD ORIG_HEAD):<file>    # common ancestor
```

HEAD during rebase is the rebase-in-progress tip: the target branch plus any commits already replayed. It equals the pristine target only at the first conflict. For later conflicts, read the untouched target version from the rebased-onto ref (`origin/main`, or whatever branch you rebased onto) rather than HEAD.
