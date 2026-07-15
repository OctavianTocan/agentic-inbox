# Audit UI: Activity, Traces, Evaluations

Type: grilling
Status: resolved
Blocked by: 04, 06

## Question

How should the existing Audit / traces surfaces evolve into three modes (Activity / Traces / Evaluations) for the showcase — information architecture, which screens are must-ship vs stub, and what single “policy override” trace view is required to communicate the safety architecture?

## Answer

**IA:** One Audit area with three tabs/modes:
1. **Activity** — today’s ledger-backed action log (effects). Must-ship; evolve from current `/audit`.
2. **Traces** — per-`runId` stage timeline from `trace_events`. Must-ship. `/traces` stops being a redirect-only stub.
3. **Evaluations** — experiment list + metrics + failing cases. Must-ship for showcase honesty (can be simple: table + detail, no lab chrome).

**Policy-override hero view:** selecting a run in Traces that has non-empty `policy_applied.reasons` while classify looks “routine” shows a side-by-side: model category/confidence vs policy reasons vs proposal. That single view is the portfolio safety beat.

**Deep links:** Activity row → related run’s Trace when `runId` present; Evaluations failure → Trace by `runId`.

**Not Must-ship:** LangSmith embed, replay/fork, calibration charts.

## Comments

- Resolved via defaults sweep (2026-07-15).
