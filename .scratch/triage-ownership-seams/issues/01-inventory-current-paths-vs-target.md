# Inventory today’s paths vs target ownership

Type: research
Status: resolved
Blocked by:

## Question

Given the charting baseline (TriageService mints run ids + owns SSE; ActionService alone appends ledger; Toolkit is messenger; triage resume belongs on the run / `runId`; chat off seam; issue 02 TriageEngine layers), what are the **current** call paths for: minting identity, ledger writes, decision persistence, approval pause/resume, and SSE — and where do they violate or already match the target?

Produce a short inventory (table or bullet map) a later grilling ticket can use without re-tracing fifty files.

## Answer

Ledger writes and triage SSE ownership mostly match target (`ActionService` sole appender; `TriageService` maps SSE). Largest gaps: pause/resume keyed on `conversations` + `approvalId` instead of `TriageRun` / `runId`; dual decision writers (`record_triage` tool + `persistTriage` upsert); minted `runId` never threaded to agent, ledger, or resume; one-email walk still lives in `AgentService` not a `TriageEngine` seam.

Full path tables and indirection notes: [research/01-inventory-current-paths-vs-target.md](../research/01-inventory-current-paths-vs-target.md)
