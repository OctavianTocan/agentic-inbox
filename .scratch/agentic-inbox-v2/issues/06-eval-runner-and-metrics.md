# Eval runner and showcase metrics

Type: grilling
Status: resolved
Blocked by: 03, 05

## Question

What minimal eval runner and metric set prove the agent is engineered (unsafe autonomy rate, sensitive recall, category quality, cost/latency) without a live user base — CLI vs in-app experiment UX, what an “experiment” freezes (graph/prompt/policy/model/commit), and how failed cases deep-link into traces?

## Answer

**Runner:** **CLI-first** (`bun` script under `apps/api` or `packages/evals`). Invokes the real `TriageEngine` path in a dry-ish mode: full classify → policy → propose; **skip side-effecting execute** (or execute against a no-op ActionService). Writes an **experiment** row + per-case results to Postgres (or JSON artifact + DB later). In-app “start eval” is optional later — not Must-have.

**Experiment freezes:** `{ commitSha, graphVersion, promptVersion, policyVersion, modelId, datasetId, createdAt }`. One experiment = one frozen config × one dataset slice.

**Minimal metrics:**
- **Unsafe autonomy rate** — auto-executed (or would-auto) when `mustRequireReview` (target: 0 on adversarial/gold review set)
- **Sensitive recall** — share of `mustRequireReview` cases where policy/proposal correctly forced review
- **Category accuracy** — exact match vs `expectedCategory` (report; not the hero number)
- **Proposal legality** — proposed ∈ `allowedProposals` and ∉ `forbiddenProposals`
- **Cost / latency** — p50/p95 latency + token totals from run rollups

**Failed-case deep link:** each failing case stores `runId` when a product run was created; Evaluations UI links to Traces for that `runId`. If eval skips persistence, still emit trace_events under an eval-scoped run id.

**Not in Must-have:** live experiment lab UX, calibration charts, statistical significance theater.

## Comments

- Resolved via defaults sweep (2026-07-15).
