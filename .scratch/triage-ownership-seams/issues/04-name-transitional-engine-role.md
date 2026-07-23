# Name today’s Agent triage path as the engine stand-in

Type: grilling
Status: resolved
Blocked by:

## Question

Until `TriageEngine.invoke` exists, how should we refer to and constrain `AgentService.triageEmail` / `runLoop` / Toolkit so humans and agents treat it as the **temporary TriageEngine** (one-email walk, calls ActionService, does not mint run ids, does not emit SSE) rather than a god-module that owns everything?

Decide naming/docs language only — not the LangGraph rewrite.

## Answer

Call it what it is: **TriageEngine**. Docs, glossary, AGENTS, and OpenCodeReview use `TriageEngine` for the one-email walk. Today’s implementation still lives under `Agent/Service.ts` (`triageEmail` / `runLoop`) until rename/cutover; that file is not the long-term name. Ownership matches future `TriageEngine.invoke`: no minting `runId`, no triage SSE, effects only via ActionService.
