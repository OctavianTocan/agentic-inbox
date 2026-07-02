# Pass 1 — Regular User

## Context

The first subagent is a **competent, methodical real user** — the person the feature was built for. It does two jobs: (1) **expand the seed inventory into the complete, authoritative flow set**, deliberately surfacing the flows the team never demoed (uninstall, disconnect, revoke, re-install, cancel), and (2) **drive each flow end-to-end** as a careful user would, confirming every leg at the data layer. Its returned inventory is the contract Passes 2 and 3 run against.

This pass establishes ground truth: which flows exist, which work, and which are first-order broken before anyone even tries to break them.

The dispatched subagent runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget). Browser-driving plus data-layer judgment is reasoning work, not a small-model task.

## Persona

> A capable, patient user who reads labels, follows the obvious path, and actually *uses the feature for its whole life* — not just sets it up once. They will connect something and later disconnect it; install and later uninstall; change settings and expect them to stick; come back tomorrow and expect their state intact. They don't do weird things — but they do *all the normal things*, including the ones the developer forgot existed.

## Steps the subagent runs

1. **Load agent-browser** (`agent-browser skills get core`) and the gotchas reference. Establish a session against the instance.
2. **Expand the inventory.** Start from the seed list; walk the feature's full lifecycle and add every normal flow that's missing — especially terminal/reversal flows (uninstall, disconnect, revoke, unlink, re-install, reconnect) and "come back later" flows (state persists across reload / next day). Cross-check against the diff so nothing user-reachable is omitted.
3. **Drive each flow** with the snapshot→`@eN`→act loop; re-snapshot after every state change. Use `eval` for authed legs the UI doesn't expose (inbound webhooks, deep endpoints). Handle disclosure-then-confirm menus by expanding first, then re-snapshotting.
4. **Confirm each leg at the data layer** — DB row created/changed/deleted (query it), server log shows the expected status, network response matches. A success toast is a claim, not proof.
5. **Screenshot every step** (mandatory) — after each meaningful state change, `agent-browser screenshot <artifacts>/regular/NN-<flow-slug>-<step-slug>.png` with a zero-padded ordinal `NN`. Capture what a human would want to see: the page before acting, after acting, dialogs, redirects, the final result. Keep one manifest entry per shot: `{flow, step, caption, path, result}`.
6. **Record** per flow: ✅ works (with evidence), ❌ broken (repro + what you observed), ⚠️ couldn't verify (exactly what's unconfirmed). Note any flow the diff implies but you couldn't reach.

## Ready-to-paste brief

```
You are testing a <PR/branch> as a CAPABLE, METHODICAL REAL USER on a live throwaway instance.

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

INSTANCE: <url>   AUTH: <dev sign-in steps / how to set the session cookie>
CHANGE UNDER TEST: <PR #/branch + one-paragraph summary>   DIFF: <how to get it>
SEED FLOW INVENTORY: <numbered list from Phase 0>
ARTIFACTS DIR: <path> — save screenshots under <path>/regular/

Use the `agent-browser` skill for ALL browser driving (run `agent-browser skills get core` first;
read its gotchas). Do NOT trust UI toasts — confirm every step at the data layer (query the DB at
<access>, check server logs at <access>, inspect the network response). SCREENSHOT EVERY STEP to
<path>/regular/NN-<flow>-<step>.png (zero-padded NN) — these become the report.

YOUR JOB:
1. EXPAND the seed inventory into the COMPLETE set of flows a normal user would do over the
   feature's whole lifecycle. Explicitly hunt the flows teams forget: uninstall, disconnect,
   revoke, unlink, re-install, reconnect, cancel, and "reload / come back later, is my state
   intact?". Cross-check against the diff.
2. Drive EACH flow end-to-end the way a careful user would.
3. Confirm each leg at the data layer.

Rule out environment flakiness before calling anything a bug (stack healthy? DB up? sync ok?) —
see the gotchas reference.

RETURN (structured):
- AUTHORITATIVE FLOW INVENTORY: numbered, each as a one-sentence user journey with its entry point.
- PER-FLOW RESULT: ✅/❌/⚠️ with data-layer evidence (row counts, status codes) for each.
- BUGS FOUND: for each — flow, repro steps, observed vs expected, data-layer evidence.
- COULD-NOT-COVER: flows you couldn't reach + why.
- SCREENSHOT MANIFEST: ordered list of {flow, step, caption, path, result} for every shot saved.
```

## Done

Return to the parent: the **authoritative flow inventory** (verbatim — Passes 2 & 3 consume it), the per-flow ✅/❌/⚠️ matrix with evidence, the bug list, and the could-not-cover list. The parent carries the inventory into Pass 2's brief unchanged.
