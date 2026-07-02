# Fix-and-Document (the default end of the gauntlet)

## Context

Fixing is the **default end of the run, not an option**. The user's standing instruction: *"just fix everything they find every time, and let me know afterwards what changed in the same document."* So after synthesis, the parent dispatches fix subagents to implement **every confirmed finding** — correctness/security bugs AND high-value usability/accessibility/mobile fixes — runs the project's verification until green, and then **appends a "Fixes applied" section to the SAME Notion page** the report was published to. Not a new page: the report and what-changed live together so the user reads one document.

This runs **after synthesize.md** (which has already resolved persona conflicts and distinguished product bugs from environment artifacts — you never fix an env artifact) and **before the final publish/append** in notion-report.md. Pipeline: enumerate → personas → synthesize → **fix-and-document** → publish/append.

## What "every finding" means

- **Always fix:** confirmed correctness bugs, security vulnerabilities (never deferred silently), accessibility blockers/majors, mobile blockers/majors, concurrency/data-corruption bugs.
- **Fix by default (high value):** usability blockers/majors from the novice pass, missing-affordance/efficiency-cliff findings from the power pass, minor a11y/mobile papercuts when the fix is small and local.
- **Do NOT fix:** anything synthesis flagged as an **environment/config artifact** (not a product bug); a finding that needs a **product/design decision** (surface it as an open question instead — see "needs a human"); a "fix" whose scope explodes beyond the change under test (note it, don't gold-plate).

When in doubt, fix it — the standing instruction is "fix everything they find." Document anything you chose NOT to fix, with the reason.

## Dispatching the fix subagents

1. **Cluster the findings by file/area into disjoint sets.** Group findings that touch the same files into one cluster; keep clusters' file sets **non-overlapping** so subagents can run in parallel without colliding. (Two subagents editing the same file will clobber each other — disjoint scopes are what makes parallelism safe.)
2. **One fix subagent per cluster.** Each runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget) — these write production code, so the model and thinking budget are not negotiable.
3. **Brief each fully** (fresh context): the findings in its cluster (with repro + root cause + data-layer evidence from synthesis), the exact files it owns, the instruction to **fix root causes not symptoms**, to **add a test for anything with logic** (a regression test that fails before / passes after — per the repo's bug-fix rule), to follow the repo's conventions and activate the relevant project skills (e.g. code-quality, the domain skill for the area), and to return a structured per-finding changelog.
4. **Disjoint scopes parallelize; overlapping scopes serialize.** If two clusters genuinely must touch the same file, run them sequentially and brief the second with the first's diff.

### Ready-to-paste fix brief

```
You are a FIX agent for the test-user-flows gauntlet. Implement the findings below on <PR/branch>.

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

FILES YOU OWN (do not touch files outside this set): <disjoint file list>
FINDINGS TO FIX (each with repro + root cause + data-layer evidence):
  <cluster's findings from synthesis>

RULES:
- Fix ROOT CAUSES, not symptoms. Surgical changes — every changed line traces to a finding.
- For anything with logic, add/extend a test that FAILS before your fix and PASSES after (repo bug-fix rule).
- Match existing patterns; read the file's exports + immediate callers before editing. Activate the
  repo's relevant skills (code-quality for any TS edit, the domain skill for the area).
- Do NOT fix anything flagged as an environment/config artifact. Do NOT make product/design decisions —
  if a finding needs one, leave it and flag it instead.

RETURN (structured), per finding:
- finding (id/short title) · files changed · what changed · why (root cause) · test added (name/path)
  · verification status (typecheck/lint/test result for your slice).
- Anything you deliberately did NOT fix in your cluster + the reason.
- Anything needing a human product/design decision.
```

## Verify until green

After the fix subagents return, the parent runs the **project's full verification** and does not stop at the first green slice — the whole thing must pass:

- Run the repo's verification command (in this monorepo: `bun run ci` — repo-policy + lint + typecheck + tests + arch checks; or the scoped `bun run typecheck` / `bun run test` / `bun run check` while iterating).
- If anything fails, dispatch a follow-up fix subagent (same model + thinking) scoped to the failure, and re-run. Loop until clean.
- **Fail loud:** never report "fixed" on a finding whose verification didn't actually pass. If a fix can't be made green within scope, say so explicitly and leave it for the human.

## Re-verify the fix in the browser (when warranted)

For a fix to a flow that a persona reported broken, it is worth **re-driving that one flow** (a short agent-browser pass on the same instance) to confirm the fix holds end-to-end and capture an after screenshot for the report. Do this for the headline bugs, not every papercut.

## Append to the SAME Notion page (not a new one)

Take the page id captured when notion-report.md created the report, and **append** a "Fixes applied" / "What changed" section as new child blocks on that page (look up the block-children shape at runtime — `ntn api v1/blocks/{id}/children --docs`). The section contains:

- **Fixes applied** — per finding: what was broken → files changed → what changed → why (root cause) → test added → verification status (and an after-screenshot for headline flows).
- **Not fixed (deliberate)** — anything intentionally left, each with its reason (env artifact, out of scope, low-value papercut deferred).
- **Needs a human decision** — anything that required a product/design call, framed as an explicit question, not a silent skip.
- **Verification** — the final state of `bun run ci` (or the repo's check): green, with what ran.

Then re-fetch the page to confirm the appended section landed, and return the **same** page URL. The deliverable is one document: the findings and the fixes for them, in the same place.

## Done

Hand back: the count of findings fixed vs deferred, the final verification status (green or exactly what's still red and why), the list of anything needing a human decision, and the **(same) Notion page URL** now carrying both the report and the "Fixes applied" section. Never claim a finding fixed without its verification actually passing; never silently drop a finding — fixed, deferred-with-reason, or needs-a-human, every finding is accounted for.
