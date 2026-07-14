# Define no_action vs flag_for_review

Type: grilling
Status: resolved
Blocked by:

## Question

Notion’s graph branches `propose_action → no_action → finalize`, but today’s `ActionKind` is only `send_reply` | `archive` | `flag_for_review` | `undo`. What should “leave this email alone” mean in Must-have — a new `no_action` kind, reuse of `flag_for_review`, or a non-ledger skip — and how does that choice change propose→finalize edges, inbox status, and eval allowed/forbidden actions?

## Answer

**`no_action` and `flag_for_review` are two different outcomes.**

| | `no_action` | `flag_for_review` |
|---|---|---|
| Meaning | Triage finished; nothing to do; no human queue | Defer to a human |
| Representation | Proposal-only (not a ledger `ActionKind`) | Ledger `ActionKind` (unchanged) |
| Graph | `propose_action → finalize` only — no execute, no approval pause | Still executes as today’s flag effect |
| Inbox status | `done_for_you` | `needs_attention` |
| Evals | In **proposal** allowed/forbidden (`send_reply \| archive \| flag_for_review \| no_action`) | Same proposal vocab; still a ledger kind too |

**Ledger `ActionKind` stays** `send_reply | archive | flag_for_review | undo` — no `no_action` row. The run/proposal/trace records the choice; Activity stays “what changed?”

**vs archive:** `archive` = done and filed (`filed`). `no_action` = done, leave it in place (`done_for_you`). Keep today’s “activity/status updates with no reply → archive” rule; do not use `no_action` as a second archive.

**Status derivation:** classified + no ledger action is no longer enough to imply `needs_attention` — a finalized `no_action` proposal must count as handled.
