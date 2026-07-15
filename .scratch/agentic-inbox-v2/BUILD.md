# Build plan — Agentic Inbox v2 Must-have

Wayfinder map is **complete**. Implement by hand in this order. Decisions live in `.scratch/agentic-inbox-v2/issues/` (linked from `map.md`).

## Phase 1 — Runs & domain (start here)

- [ ] `triage_runs` table + `runId === thread_id`
- [ ] Pending approval on the run (drop parallel `approvalId`)
- [ ] Ledger unique `(run_id, action_kind, action_revision)`
- [ ] `no_action` proposal → finalize, `done_for_you`, no ledger row
- [ ] Policy returns `{ sensitive, reasons[] }` (keep boolean for back-compat if needed)
- [ ] Demo wipe semantics for retriage / `fresh`

## Phase 2 — LangGraph cutover

- [ ] `TriageEngine.invoke` adapter under `apps/api/src/Modules/Triage/Engine/`
- [ ] Graph: load → classify → apply_policy → propose → (interrupt | execute) → finalize
- [ ] Postgres checkpointer (resume-only; never UI blobs)
- [ ] Cancel-and-restart: wipe in-flight triage conversations on cutover
- [ ] Chat stays Effect AI; triage loop deleted

## Phase 3 — First-party traces

- [ ] `trace_events` with envelope `{ id, runId, seq, ts, kind, payload }`
- [ ] Emit mandatory `classified` + `policy_applied` + `proposed`
- [ ] Rollup tokens/latency/(optional cost) on terminal event
- [ ] Traces UI + policy-override side-by-side view

## Phase 4 — Evals

- [ ] `data/evals/gold.json` (≥20) + `data/evals/adversarial/` (≥10)
- [ ] CLI experiment runner; freeze versions; skip real side effects
- [ ] Metrics: unsafe autonomy, sensitive recall, category accuracy, proposal legality, cost/latency
- [ ] Evaluations UI table + deep link to Traces

## Phase 5 — Redis + synthetic

- [ ] Redis: triage permits, OpenRouter rate limit, email dedup TTL
- [ ] `source: seed | synthetic`; structured scenario → email

## Phase 6 — README

- [ ] Case-study rewrite only after Phases 1–5 artifacts exist
- [ ] Include rejected alternatives (dual engine, Rivet, Redis-as-DB, LangSmith-as-audit)

## Do not build (out of scope)

Teach workspace, dual Legacy engine, Rivet mailbox, regeneration-on-resume, Gmail OAuth, Redis Streams, paste-email mode, LangSmith-required UI.
