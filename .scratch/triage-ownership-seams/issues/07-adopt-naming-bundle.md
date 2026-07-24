# Adopt clearer naming bundle

Type: grilling
Status: resolved
Blocked by:

## Question

What names should replace the confusing Run / TriageService / TriageEngine / Decision / Proposal / ActionService / AgentService sprawl so ownership rules stay readable?

## Answer

Adopt this bundle for docs, glossary, map language, and future code renames (wire/`runId` may stay as an alias until HTTP and LangGraph catch up):

| Old | New |
| --- | --- |
| Run / `runId` | Attempt / `attemptId` (`threadId` remains LangGraph alias; `runId` soft alias on the wire if needed) |
| TriageService | InboxOrchestrator |
| TriageEngine | TriageAgent |
| Decision | Classification |
| Proposal | NextAction |
| ActionService | LedgerService |
| Ledger | Ledger (unchanged) |
| AgentService (god file) | Split: TriageAgent + ChatAgent; resume / mint / SSE stay on InboxOrchestrator |
| Toolkit | Toolkit (still Effect AI adapter only; not a domain owner) |

Ownership rules from tickets 02–06 still hold; restate them with new names:

1. Only InboxOrchestrator mints `attemptId` / `threadId`.
2. Only LedgerService appends the ledger.
3. Only InboxOrchestrator writes Attempt rows and Classifications from agent outcomes.
4. Triage resume key is `attemptId` (=== `threadId`); pause payload on the Attempt.
5. Only InboxOrchestrator emits triage SSE.
6. TriageAgent must not talk to ledger / attempt / classification repos directly.
7. ChatAgent must not define the triage resume path.
