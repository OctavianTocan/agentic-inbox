# Cutover: delete the old orchestration loop

Type: grilling
Status: open
Blocked by: 02

## Question

When LangGraph is the only `TriageEngine`, how do you retire `Agent/Service.ts` triage orchestration (turns, toolkit handlers, conversation-tied approval state) without breaking pending approvals, chat, or ledger undo — cancel-and-restart vs one-shot migration, and what files are allowed to remain as Effect AI for chat only?

## Answer

<!-- filled on resolve -->
