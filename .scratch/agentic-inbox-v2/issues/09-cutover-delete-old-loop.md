# Cutover: delete the old orchestration loop

Type: grilling
Status: resolved
Blocked by: 02

## Question

When LangGraph is the only `TriageEngine`, how do you retire `Agent/Service.ts` triage orchestration (turns, toolkit handlers, conversation-tied approval state) without breaking pending approvals, chat, or ledger undo — cancel-and-restart vs one-shot migration, and what files are allowed to remain as Effect AI for chat only?

## Answer

**Cutover style:** **Cancel-and-restart** (showcase, no live users). On deploy of LangGraph engine: wipe in-flight triage conversations / pending approvals (same family as demo `fresh`), then only `TriageEngine.invoke` handles triage. No dual-run, no migrate-prompt-blob migration.

**Delete / stop using for triage:** Effect AI `runLoop` triage path, conversation-tied approval as the pause store, triage toolkit-as-orchestrator. Approval state lives on `triage_runs` + LangGraph checkpoints (per tickets 02–03).

**Remain as Effect AI (chat only):** inbox chat loop, ChatToolkit, chat conversations, HTTP chat — explicitly **off** `TriageEngine` until a later effort. Ledger undo via `ActionService` stays Effect HTTP.

**Package layout:** LangGraph adapter as **in-app module** under `apps/api/src/Modules/Triage/Engine/` (or similar) — not a new `packages/*` until sharing forces it.

**Resume surface:** approve / deny / edit body only — **no** request-regeneration in Must-have.

## Comments

- Resolved via defaults sweep (2026-07-15).
