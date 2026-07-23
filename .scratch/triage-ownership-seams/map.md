# Triage ownership seams — wayfinder map

Label: `wayfinder:map`

## Destination

An ownership table plus hard seam rules — using the naming bundle in [Adopt clearer naming bundle](issues/07-adopt-naming-bundle.md) — so “where does X happen?” has one module answer. Rules stay true for today’s Effect loop and after LangGraph cutover. Publish to AGENTS, `.opencodereview`, and `docs/agent-patterns`.

## Notes

- **Domain:** Agentic Inbox triage orchestration glue — readability and separation of concerns, not LangGraph build.
- **Execution:** Wayfinder sessions resolve decisions only. No product code in this map unless a ticket is explicitly a `task` that unblocks a decision. Code renames to the naming bundle are out of scope until asked.
- **Baseline:** Treat [Freeze the TriageEngine Effect seam](../agentic-inbox-v2/issues/02-freeze-triage-engine-seam.md) as fixed for *roles*; prefer the new names (InboxOrchestrator / TriageAgent / LedgerService / Attempt) when writing new rules.
- **Tracker:** Local markdown under `.scratch/triage-ownership-seams/` (see `docs/agents/issue-tracker.md`).
- **Skills when resolving:** `/grilling`, `/domain-modeling`; research may read repo sources and v2 map tickets.
- **Repo hotspots (today’s paths):** `apps/api/src/Modules/{Triage,Agent,Actions,Chat}/*` — map to InboxOrchestrator, TriageAgent, LedgerService, ChatAgent when renaming.
- **Glossary:** root [`GLOSSARY.md`](../../GLOSSARY.md) uses the new names.
- **Implementation progress (2026-07-23):** InboxOrchestrator mints/finalizes Attempt rows (`completed` / `interrupted` / `failed`); `runId` threads TriageAgent → Toolkit → LedgerService → ledger; `record_triage` no longer dual-writes Classifications. Still open: resume-by-attemptId (drop conversation/`approvalId`), inbox pending from Attempt, `no_action`, mass rename, LangGraph.
- **Already settled in charting (not ticket answers — preferences that shape the map):**
  - Destination style: ownership table + hard PR/agent rules (not folder-move plan alone).
  - One ownership story before and after cutover (no temporary second architecture).
  - Publish targets: `apps/api/AGENTS.md`, `.opencodereview/rules/api.md`, `docs/agent-patterns/triage-ownership-seams.md`.
  - Out of scope for *decision* tickets: LangGraph build and mass rename until asked.

## Decisions so far

<!-- the index — one line per closed ticket -->

- [Inventory today’s paths vs target ownership](issues/01-inventory-current-paths-vs-target.md) — Ledger + triage SSE mostly match; violate on conversation/`approvalId` resume, dual classification writers, orphan attempt id, Agent-as-everything, chat sharing triage tools. Detail: [research/01…](research/01-inventory-current-paths-vs-target.md).
- [Who upserts TriageRun lifecycle?](issues/02-who-upserts-triage-run-lifecycle.md) — Only InboxOrchestrator (then `TriageService`) creates/advances Attempt rows; TriageAgent never touches the attempts repo.
- [Who persists Decision rows during triage?](issues/03-who-persists-decisions.md) — Only InboxOrchestrator persists Classifications from agent outcomes; ban mid-loop dual writers.
- [Name today’s Agent triage path as the engine stand-in](issues/04-name-transitional-engine-role.md) — Superseded by ticket 07: call it TriageAgent (not TriageEngine).
- [Ownership table and hard seam rules wording](issues/05-ownership-table-and-hard-rules.md) — Seven hard rules; Toolkit adapter only; LedgerService is the ledger door. Re-read with names from ticket 07.
- [Publish seam rules to AGENTS, OpenCodeReview, agent-patterns](issues/06-publish-rules-to-doc-surfaces.md) — `apps/api/AGENTS.md` short block; `.opencodereview/rules/api.md` DO-flags; new agent-patterns note.
- [Adopt clearer naming bundle](issues/07-adopt-naming-bundle.md) — Attempt/`attemptId`, InboxOrchestrator, TriageAgent, Classification, NextAction, LedgerService, ChatAgent split; `runId` soft wire alias OK.

## Not yet specified

- Whether inbox `pendingApproval` derivation needs its own follow-up once resume-by-attempt id is implemented.
- Order of code renames (symbols vs folders vs OpenAPI) when execution is requested.
- Whether OpenAPI keeps `runId` as the published field name while docs say Attempt.

## Out of scope

- Building LangGraph adapter behind TriageAgent.
- Mass rename of source files until asked.
- Reopening [Freeze the TriageEngine Effect seam](../agentic-inbox-v2/issues/02-freeze-triage-engine-seam.md) role split (only the labels change).
- Web UI redesign; Redis; evals; traces UI.
