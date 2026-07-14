# Immutable runs vs LangGraph checkpoints

Type: grilling
Status: resolved
Blocked by: 02

## Question

How should product-level `triage_runs` / `trace_events` / approval records relate to LangGraph Postgres checkpoints — what is stored in each, what the UI may show, and how retriage becomes a new linked run instead of destructive overwrite — while keeping execute_action idempotent (`run_id + action_kind + action_revision`)?

## Answer

**Identity:** `runId` === LangGraph `thread_id` === HTTP resume key. One string. No separate public approval id.

**Storage split** (LangGraph-style: checkpointer ≠ product truth):

| Store | Owns | UI |
|--|--|--|
| LangGraph Postgres checkpoints | Engine resume / HITL / crash recovery only | Never show raw blobs |
| `triage_runs` (+ pending approval on the run) | Product status for one attempt | Inbox / resume |
| `action_ledger` | Effects; unique `(run_id, action_kind, action_revision)` | Activity |
| `trace_events` | Redacted timeline (shape → ticket 04) | Traces |

**Within a run:** do not overwrite history in place; execute is idempotent on that triple. `action_revision` starts at 1; bump only when the executable payload changes (e.g. edited reply body) so a new effect is allowed; same revision on resume/retry must not double-write.

**Retriage / `fresh`:** not linked parent runs. Demo wipe only — clear product triage state (runs, traces, approvals, ledger) and LangGraph threads for wiped runs (`delete_thread`), then run again. Same idea for per-email retriage if that button stays.

## Comments

- Session paused after accepting the split; further grill deferred.
