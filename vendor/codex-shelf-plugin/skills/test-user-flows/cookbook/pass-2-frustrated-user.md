# Pass 2 — Frustrated User (bad day)

## Context

The second subagent runs the **same flows** Pass 1 mapped, but as a user who is **impatient, annoyed, and having a bad day**. They don't read carefully, they double-click because nothing happened fast enough, they hit back when a page is slow, they refresh out of frustration, they paste the wrong thing, they rage-retry. This is the adversarial pass — it finds the robustness bugs the happy path hides: races, double-writes, false success, state corruption, 500s where a graceful error belongs, and cross-tenant leaks.

It runs **only after Pass 1 returns**, against Pass 1's authoritative inventory, on the same instance (start a fresh session so you don't inherit Pass 1's state). The dispatched subagent runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget).

## Persona

> Someone in a hurry and already irritated. Clicks twice when the button doesn't respond instantly. Hits Back and Refresh mid-flow. Abandons halfway and starts over. Opens the same thing in two tabs. Pastes a giant blob, an emoji, or last week's clipboard into the form. Denies the permission prompt by reflex, then complains it didn't work. Tries to undo things, redo them, and do them again. Not a hacker — just hostile-by-impatience, which is most of your real users on their worst day.

## The bad-day matrix

Apply each move to each flow where it's physically possible. For every cell: **predict** the correct behavior, **do** the annoying thing, **confirm** the outcome at the data layer, note the bug class on divergence.

| Move | How (agent-browser) | Hunts |
| --- | --- | --- |
| Double / rapid submit | `click @eN` twice fast; fire the `eval` POST 2–5× concurrently | Double-write, duplicate rows, race; no idempotency / no disable-after-click |
| Back-button mid-flow | drive to step 2, `back`, resubmit step 1 | Stale state replayed, orphaned half-records |
| Refresh mid-redirect | reload / re-open the callback URL during an OAuth/install redirect | Callback re-entry double-processing; lost flow state |
| Already-in-state | run a flow whose effect already exists (install when installed, connect when connected) | No pre-check → confusing error or silent duplicate |
| Re-run terminal action | disconnect/delete/uninstall something already in that terminal state | 404 vs idempotent 204; crash on second delete |
| Stale / missing session | `cookies clear` mid-flow, then continue | Unhandled 401 → white screen vs graceful re-auth; half-applied action |
| Empty input | submit required fields blank | Missing validation; 500 instead of 400 |
| Oversized input | paste 10k+ chars / huge file (use `--data-binary @file`, not argv) | Truncation, 413 vs 500, column overflow |
| Malformed / injection | `' OR 1=1`, `<script>`, emoji, control chars, wrong types via `eval` | XSS, SQL-error leak, unhandled parse → 500 |
| Denied permission | cancel/deny the OAuth consent or native prompt | Treats deny as success; dangling pending record |
| Concurrent tabs | two agent-browser sessions driving the same flow at once | Lost-update, double-create, last-write-wins clobber |
| Direct-URL deep link | `open` a deep route / callback directly, skipping the entry flow | Assumes prior-step state; crash or auth bypass |
| Tampered callback params | hit the callback with missing/wrong `state`, `code`, `id`, signature | Forged/missing params accepted; CSRF via missing state check |
| Cancel-then-retry | abandon a flow partway, restart from the top | Leftover lock / half-record blocks the retry |
| Wrong-org / wrong-user | act on another tenant's resource id (swap the id in the `eval` body) | Cross-tenant read/write leak; broken authorization / RLS |

### A finding is a bug if it is

state corruption · false success (UI says ✓, data says ✗, or vice versa) · silent failure (error swallowed, user told nothing) · 500 where 4xx + a message belongs · cross-tenant leak · double-write / race.

## Ready-to-paste brief

```
You are testing a <PR/branch> as a FRUSTRATED, IMPATIENT USER HAVING A BAD DAY on a live throwaway instance.

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

INSTANCE: <url>   AUTH: <…>   (start a FRESH agent-browser session)
CHANGE UNDER TEST: <…>   DIFF: <…>
FLOW INVENTORY (from the regular-user pass — test ALL of these): <paste Pass 1 inventory>
ARTIFACTS DIR: <path> — save screenshots under <path>/frustrated/

Use the `agent-browser` skill (run `agent-browser skills get core` and `agent-browser skills get
dogfood`; read the gotchas reference). Confirm EVERY finding at the data layer (DB/log/network) —
never trust a toast. SCREENSHOT EVERY STEP to <path>/frustrated/NN-<flow>-<cell>.png (zero-padded
NN) — capture especially the broken/error/corrupted states, since those are the report's evidence.

For EACH flow, walk the bad-day matrix (double/rapid submit, back & refresh mid-flow, already-in-state,
re-run terminal actions, stale session, empty/oversized/malformed/injection input, denied permission,
concurrent tabs, direct deep links, tampered callback params, cancel-then-retry, wrong-org/wrong-user).
Pick the cells that physically apply to each flow.

For each applicable cell: write the predicted-correct behavior, do the annoying thing, confirm reality
at the data layer, record ✅ (holds) or ❌ (bug + class). On a ❌, REPRODUCE it deterministically and
root-cause it (distinguish app-layer rejection — no SQL ran — from a DB-layer result). Rule out
environment flakiness before blaming the diff.

RETURN (structured):
- PER-FLOW × PER-CELL: ✅/❌/skipped(why), with data-layer evidence for each ❌.
- BUGS: class · flow · cell · deterministic repro · root cause · suggested regression test.
- CELLS DELIBERATELY SKIPPED: + why (silent omission reads as "covered").
- SCREENSHOT MANIFEST: ordered list of {flow, cell, caption, path, result} for every shot saved.
```

## Done

Return the per-flow × per-cell matrix, the classified bug list with repros + root causes + suggested regression tests, and the explicitly-skipped cells. Bug fixes need a test that fails before / passes after — propose one per bug.
