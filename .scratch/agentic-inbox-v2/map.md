# Agentic Inbox v2 — Must-have wayfinder map

Label: `wayfinder:map`

Source brief: [Agentic Inbox v2 — LangGraph, Evals, Traces, Redis & Rivet](https://app.notion.com/p/39d3c065308b815fa0cfc3c38421396e)

## Destination

A decision map clear enough that you can implement Agentic Inbox v2 **Must-have** yourself, by hand, phase by phase — without the agent shipping the code. The map is done when nothing material is left to decide before you build.

Portfolio finish line (from Notion Must-have): LangGraph triage behind an Effect seam, durable Postgres checkpoints, exact approval resume, idempotent execution, immutable run history, first-party traces, gold + adversarial evals, thin Redis coordination, synthetic source abstraction, case-study README.

## Notes

- **Domain:** Agentic Inbox showcase — Effect HTTP/API/repos/policy stay; LangGraph replaces the current orchestration loop only.
- **Execution:** You implement. Wayfinder sessions resolve decisions; they do not write product code unless a ticket is explicitly a `task` that unblocks a decision.
- **Defaults mode:** Prefer recommended defaults with one-shot confirm over one-by-one grilling when the human asks. Remaining tickets were closed under that mode (2026-07-15).
- **Tracker:** Local markdown under `.scratch/agentic-inbox-v2/` (see `docs/agents/issue-tracker.md`). GitHub issues unavailable here.
- **Skills when resolving:** `/grilling`, `/domain-modeling`; research tickets may use Context7 / primary sources linked in the Notion brief.
- **Repo hotspots:** `apps/api/src/Modules/Agent/*`, `Triage/*`, `Actions/Policy.ts`, `packages/api-core`, `apps/web` audit/traces, `data/emails.json`.
- **Already settled in charting (not ticket answers — preferences that shape the map):**
  - One `TriageEngine` seam; **LangGraph-only** implementation (no dual Legacy engine, no shadow dual-run).
  - Effect remains the application spine (HTTP, schemas, repos, typed errors, deterministic policy, ledger).
  - No migration baseline gate (no live users); evals remain as **showcase** capability.
  - Redis stays in-route as thin coordination (rate limits / permits / short-lived dedup), not a domain DB.
  - Teach workspace dropped from this effort.
- **Phase order to implement (map complete — build in this order):**
  1. Immutable versioned runs + ledger idempotency + `no_action`
  2. LangGraph cutover behind `TriageEngine.invoke` (cancel-and-restart)
  3. First-party `trace_events` + Traces UI (policy-override view)
  4. Gold/adversarial datasets + CLI eval runner
  5. Thin Redis coordination
  6. Synthetic source (`seed` \| `synthetic`)
  7. Evaluations tab + honest README case study

## Decisions so far

<!-- index — one line per closed ticket -->

- [Map current orchestration onto LangGraph nodes](issues/01-map-orchestration-to-langgraph-nodes.md) — Per-email stages already match Notion’s graph but are collapsed into `generateDecision` + `runLoop`; batch/chat/destructive retriage stay outside LangGraph. Detail: [research/01…](research/01-map-orchestration-to-langgraph-nodes.md).
- [Define no_action vs flag_for_review](issues/12-no-action-vs-flag.md) — `no_action` ≠ flag: proposal-only terminal → finalize, status `done_for_you`, no ledger row; evals use proposal vocab including `no_action`; archive still means filed.
- [Freeze the TriageEngine Effect seam](issues/02-freeze-triage-engine-seam.md) — `invoke` only; caller mints `threadId`; full `Email` in; completed \| interrupted out; resume by `threadId` (no `approvalId`); engine executes via `ActionService`; SSE stays in `TriageService`; chat off this seam.
- [Immutable runs vs LangGraph checkpoints](issues/03-immutable-runs-vs-checkpoints.md) — `runId` = checkpoint `thread_id`; checkpoints resume-only (no UI blobs); product owns `triage_runs` / ledger / traces; execute unique on `(run_id, action_kind, action_revision)`; retriage/`fresh` = demo wipe, not linked runs.
- [First-party trace event schema](issues/04-first-party-trace-schema.md) — Redacted stage events (`run_started`…`run_completed`/`failed`); structured policy reasons; mandatory classify+policy+propose; metrics on rollup; envelope `{id,runId,seq,ts,kind,payload}`; never prompts/bodies/checkpoints.
- [Gold and adversarial dataset contract](issues/05-gold-adversarial-dataset-contract.md) — Gold labels in `data/evals/gold.json` keyed to seed ids; adversarial under `data/evals/adversarial/`; required label fields; ≥20 gold / ≥10 adversarial.
- [Eval runner and showcase metrics](issues/06-eval-runner-and-metrics.md) — CLI-first experiments freezing commit/graph/prompt/policy/model/dataset; metrics: unsafe autonomy, sensitive recall, category accuracy, proposal legality, cost/latency; fail → Trace by `runId`.
- [Thin Redis coordination design](issues/07-thin-redis-coordination.md) — Permits + OpenRouter rate limit + short email dedup around Effect/`TriageService`; not domain SoT; no Streams/cache.
- [Synthetic source abstraction without Rivet](issues/08-synthetic-source-without-rivet.md) — `seed` \| `synthetic` only; structured scenario before prose; Rivet/paste/Gmail deferred.
- [Cutover: delete the old orchestration loop](issues/09-cutover-delete-old-loop.md) — Cancel-and-restart wipe; LangGraph-only triage; chat stays Effect AI; adapter in-app under Triage; no resume regeneration.
- [Audit UI: Activity, Traces, Evaluations](issues/10-audit-ui-activity-traces-evals.md) — Three modes; Activity+Traces+Evaluations must-ship; policy-override side-by-side is the safety hero view.
- [README case-study outline](issues/11-readme-case-study-outline.md) — Product→architecture→safety→evals→trade-offs→setup; rewrite only after traces, CLI experiment, Redis path, and synthetic/adversarial artifacts exist.

## Not yet specified

<!-- map complete — fog cleared into tickets or out of scope -->

_(none — destination reachable with decisions above)_

## Out of scope

- Teach / `learn/` workspace as a deliverable of this effort.
- Dual `LegacyTriageEngine` + shadow comparison cutover.
- Migration baseline-before/after as a release gate.
- Rivet Actor synthetic mailbox (and Rivet Workflows around LangGraph).
- Replay / fork UI, calibration charts, paste-an-email mode (Notion “strong optional”).
- Gmail OAuth, real outbound email, Redis Streams/Pub-Sub, semantic caching, full Effect teardown.
- Must-have resume **request regeneration** (re-propose) — approve / deny / edit only.
- Optional LangSmith links in Traces UI (ops-only; not required for portfolio).
- Multi-tenant Redis priority classes.
- In-app eval “lab” UX beyond a simple Evaluations table.
