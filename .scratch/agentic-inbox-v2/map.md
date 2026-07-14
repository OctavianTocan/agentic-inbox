# Agentic Inbox v2 — Must-have wayfinder map

Label: `wayfinder:map`

Source brief: [Agentic Inbox v2 — LangGraph, Evals, Traces, Redis & Rivet](https://app.notion.com/p/39d3c065308b815fa0cfc3c38421396e)

## Destination

A decision map clear enough that you can implement Agentic Inbox v2 **Must-have** yourself, by hand, phase by phase — without the agent shipping the code. The map is done when nothing material is left to decide before you build.

Portfolio finish line (from Notion Must-have): LangGraph triage behind an Effect seam, durable Postgres checkpoints, exact approval resume, idempotent execution, immutable run history, first-party traces, gold + adversarial evals, thin Redis coordination, synthetic source abstraction, case-study README.

## Notes

- **Domain:** Agentic Inbox showcase — Effect HTTP/API/repos/policy stay; LangGraph replaces the current orchestration loop only.
- **Execution:** You implement. Wayfinder sessions resolve decisions; they do not write product code unless a ticket is explicitly a `task` that unblocks a decision.
- **Tracker:** Local markdown under `.scratch/agentic-inbox-v2/` (see `docs/agents/issue-tracker.md`). GitHub issues unavailable here.
- **Skills when resolving:** `/grilling`, `/domain-modeling`; research tickets may use Context7 / primary sources linked in the Notion brief.
- **Repo hotspots:** `apps/api/src/Modules/Agent/*`, `Triage/*`, `Actions/Policy.ts`, `packages/api-core`, `apps/web` audit/traces, `data/emails.json`.
- **Already settled in charting (not ticket answers — preferences that shape the map):**
  - One `TriageEngine` seam; **LangGraph-only** implementation (no dual Legacy engine, no shadow dual-run).
  - Effect remains the application spine (HTTP, schemas, repos, typed errors, deterministic policy, ledger).
  - No migration baseline gate (no live users); evals remain as **showcase** capability.
  - Redis stays in-route as thin coordination (rate limits / permits / short-lived dedup), not a domain DB.
  - Teach workspace dropped from this effort — ask questions as you walk the map.
- **Phase order to implement after the map is clear:** immutable versioned runs → LangGraph cutover → first-party traces → evals → Redis → synthetic source → README case study. (Baseline-as-gate skipped.)

## Decisions so far

<!-- index — one line per closed ticket -->

- [Map current orchestration onto LangGraph nodes](issues/01-map-orchestration-to-langgraph-nodes.md) — Per-email stages already match Notion’s graph but are collapsed into `generateDecision` + `runLoop`; batch/chat/destructive retriage stay outside LangGraph. Detail: [research/01…](research/01-map-orchestration-to-langgraph-nodes.md).
- [Define no_action vs flag_for_review](issues/12-no-action-vs-flag.md) — `no_action` ≠ flag: proposal-only terminal → finalize, status `done_for_you`, no ledger row; evals use proposal vocab including `no_action`; archive still means filed.
- [Freeze the TriageEngine Effect seam](issues/02-freeze-triage-engine-seam.md) — `invoke` only; caller mints `threadId`; full `Email` in; completed \| interrupted out; resume by `threadId` (no `approvalId`); engine executes via `ActionService`; SSE stays in `TriageService`; chat off this seam.
- [Immutable runs vs LangGraph checkpoints](issues/03-immutable-runs-vs-checkpoints.md) — `runId` = checkpoint `thread_id`; checkpoints resume-only (no UI blobs); product owns `triage_runs` / ledger / traces; execute unique on `(run_id, action_kind, action_revision)`; retriage/`fresh` = demo wipe, not linked runs.

## Not yet specified

- Prompt / graph / policy **version naming** scheme (strings vs semver vs commit-tied).
- Eval execution shape beyond “exists”: CLI-only vs API-started worker job for long runs.
- Optional LangSmith links beside first-party traces (links only; Postgres remains source of truth).
- Package layout for the LangGraph adapter (in-app module vs `packages/*`).
- How much of the **inbox chat** Effect AI loop is left alone vs aligned with triage tooling (seam: chat stays off `TriageEngine` until cutover).
- Whether adversarial cases live beside `data/emails.json` or in a separate corpus tree.
- Whether Must-have resume gains **request regeneration** (re-propose) beyond approve / deny / edit body.

## Out of scope

- Teach / `learn/` workspace as a deliverable of this effort.
- Dual `LegacyTriageEngine` + shadow comparison cutover.
- Migration baseline-before/after as a release gate.
- Rivet Actor synthetic mailbox (and Rivet Workflows around LangGraph).
- Replay / fork UI, calibration charts, paste-an-email mode (Notion “strong optional”).
- Gmail OAuth, real outbound email, Redis Streams/Pub-Sub, semantic caching, full Effect teardown.
