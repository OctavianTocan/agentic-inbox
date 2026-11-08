# Thin Redis coordination design

Type: grilling
Status: resolved
Blocked by: 02

## Question

Where exactly do Redis rate limits, concurrency permits, and ingest dedup sit relative to `TriageEngine` and OpenRouter calls; what keys and priority classes are in scope for a single-process showcase that still tells a defensible Redis story; and what is explicitly not Redis (approvals, ledger, checkpoints)?

## Answer

**Placement:** Redis wraps **Effect orchestration around** the engine — inside `TriageService` / HTTP edge — **not** inside LangGraph nodes and not as a domain store.

**In scope (showcase):**
1. **Concurrency permits** — semaphore limiting in-flight `TriageEngine.invoke` calls (replaces/augments process-local `TRIAGE_CONCURRENCY`).
2. **Provider rate limit** — token-bucket / fixed-window before OpenRouter calls (keyed by model/provider).
3. **Short-lived ingest dedup** — TTL key so the same email id isn’t double-enqueued within a window (batch/retriage safety).

**Keys (illustrative):** `ai:permit:triage`, `ai:rl:openrouter:{model}`, `ai:dedup:email:{emailId}` — all with TTL; no unbounded growth.

**Priority:** single class for Must-have (no multi-tenant fairness). Document that production would add classes; don’t build them.

**Explicitly not Redis:** approvals, ledger, decisions, `triage_runs`, `trace_events`, LangGraph checkpoints — all Postgres. No Redis Streams/Pub-Sub, no semantic cache (out of scope).

**Story:** “coordination plane vs system of record” — Redis for ephemeral coordination; Postgres for truth.

## Comments

- Resolved via defaults sweep (2026-07-15).
