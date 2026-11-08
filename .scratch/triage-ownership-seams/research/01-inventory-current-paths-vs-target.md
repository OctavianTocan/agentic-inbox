# Inventory: current paths vs target ownership

Baseline: [map Notes](../map.md), [issue 02 TriageEngine seam](../../agentic-inbox-v2/issues/02-freeze-triage-engine-seam.md).

## Summary table

| Concern | Current path (file → function) | Match / violate | One-line note |
|--------|--------------------------------|-----------------|---------------|
| **Identity mint (`runId` / `threadId`)** | Batch: `Triage/Service.ts` → `triageOneEmail` (`crypto.randomUUID`, `runs.create`) | Partial match | Only batch path mints `runId`; never passed to agent, ledger, or SSE; run row never updated. |
| | Retriage: `Triage/Service.ts` → `retriage` → `persistTriage` | Violate | No `runId` / `TriageRun` created. |
| | Pause state: `Chat/Repo.ts` → `save` (`crypto.randomUUID` when no `id`) via `Agent/Service.ts` → `saveLoopResult` | Violate | Conversation id minted outside `TriageService`; triage pause not keyed by `runId`. |
| | Approval id: Effect AI `tool-approval-request` in `Agent/Service.ts` → `findPendingApproval` | Violate | Resume HTTP uses `approvalId` (`Actions/Api.ts` `/approvals/:id`), not `runId`. |
| | Ledger entry id: `Actions/Repo.ts` → `append` | N/A | Entry ids are fine; `runId` on ledger rows is always unset (`ActionService` never passes `runId`). |
| **Ledger write** | Tools: `Agent/Toolkit.ts` → `makeTriageHandlers` / `makeChatHandlers` → `ActionService.sendReply` / `archive` / `flagForReview` / `undoAction` → `Actions/Repo.ts` → `append` | Match | All mutations go through `ActionService`; toolkit is adapter-only for writes. |
| | Orchestrator bypass: `Agent/Service.ts` → `latestEntryOrFlag` → `actions.flagForReview` on approve/deny with empty ledger | Match (layer) | Direct `ActionService` call, not toolkit — acceptable for engine/orchestrator, not a second writer. |
| | HTTP undo: `Actions/Http.ts` → `undo` → `ActionService.undoAction` | Match | |
| | `Triage/Service.ts` | Match | Reads/clears ledger only (`listLedger`, `clearLedger`, `clearLedgerForEmail`); does not append. |
| **Decision persist** | Authoritative (always): `Triage/Service.ts` → `persistTriage` → `decisions.upsert` after `agent.triageEmail` | Partial | Post-walk upsert is the inbox source of truth. |
| | Mid-loop (optional): `Agent/Toolkit.ts` → `record_triage` → `ActionService.recordTriage` → `DecisionsRepo.upsert` (prompted by `Agent/Prompts.ts` → `triageActionPrompt`) | Violate | Dual writer; `recordTriage` name implies ledger but writes decisions. |
| | In-memory only first: `Agent/Service.ts` → `generateDecision` → `normalizeDecision` | N/A | Decision exists in memory before tool loop; persisted via paths above. |
| **Approval pause / resume** | Pause: `Agent/Service.ts` → `triageEmail` → `runLoop` → `findPendingApproval` → `saveLoopResult` → `ConversationsRepo.save` (`status: awaiting_approval`, `pending`) | Violate | Pause state on `conversations`, not `TriageRun.pending`; `runs.create` stub never gets `interrupted`. |
| | Resume: `Actions/Http.ts` → `resolveApproval` → `Agent/Service.ts` → `resolveApproval` → `claimApproval(approvalId)` → `runLoop` (mode `'chat'`, `TriageToolkit`) → `saveLoopResult` | Violate | Key is `approvalId`; resume owned by `AgentService`, not `TriageService` / run. |
| | Inbox pending card: `Triage/Service.ts` → `inbox` → `conversations.listAwaitingApproval` → `findApprovalForEmail` | Violate | UI pending derived from conversations, not `TriageRunsRepo`. |
| **SSE (`TriageStreamEvent`)** | Emit: `Triage/Http.ts` → `run` → `Triage/Service.ts` → `run` → `triageOneEmail` maps `TriageStarted` / `TriageDecided` / `TriageActed` / `TriageApprovalPending` / `TriageFailed` + `TriageRunDone` | Match | Only `TriageService` builds triage SSE. |
| | Action events source: `Agent/Service.ts` → `triageEmail` → `actedSince` (`listLedger` before/after diff → `TriageActed`) returned to `triageOneEmail` | Partial | SSE mapping is correct owner; action events inferred via ledger diff, not direct outcomes. |
| | Retriage: `Triage/Service.ts` → `retriage` | N/A | Returns `Inbox`, no SSE stream. |
| | Chat stream: `Chat/Http.ts` → `agent.chat` → `ChatStreamEvent` | Match (chat) | Separate from triage seam; see violations below. |

## Issue 02 layer split (current vs target)

| Layer | Target | Current |
|-------|--------|---------|
| **TriageEngine** | One-email walk; calls `ActionService` | `Agent/Service.ts` → `triageEmail` (+ `runLoop`, toolkits) — no `TriageEngine` type |
| **TriageService** | Batch, mint `threadId`, SSE, inbox, wipe | `Triage/Service.ts` does batch/SSE/inbox/wipe but delegates walk to `AgentService`; mints `runId` only in `triageOneEmail` |
| **Resume HTTP** | `POST /threads/:threadId/resume` → second `invoke` | `POST /approvals/:id` → `AgentService.resolveApproval` |

## Dual writers and confusing indirection

1. **Decisions — dual upsert:** `record_triage` tool (`ActionService.recordTriage`) and `TriageService.persistTriage` (`decisions.upsert`) can both write the same email decision in one batch pass.
2. **Ledger diff for SSE:** `AgentService.actedSince` snapshots `listLedger` before the tool loop and diffs after; `TriageService` forwards the resulting `TriageActed[]` — actions are not returned as explicit invoke outcomes (future `TriageEngine.invoke` shape).
3. **`runId` orphan:** `triageOneEmail` creates `TriageRun` with placeholder proposal fields, then calls `persistTriage` with no `runId`; ledger rows have `runId: null`; approval/conversation ids are unrelated.
4. **Pause identity split:** Pending approval id in SSE (`ApprovalRequest.id` from tool framework) ≠ conversation id (`ConversationsRepo.save`) ≠ `runId` (`triage_runs.id`) — three parallel keys for one pause.
5. **Chat on triage tools:** `ChatToolkit` includes `record_triage`, `send_reply`, `archive`, `flag_for_review` (`Agent/Toolkit.ts`); chat and approval-resume both use `TriageToolkit` / shared handlers — chat not isolated from triage action surface.
6. **`recordTriage` naming:** Lives on `ActionService` but persists to `DecisionsRepo`, not the action ledger — blurs action vs decision ownership.

## HTTP entry points (quick map)

| Endpoint | Handler | Lands in |
|----------|---------|----------|
| `triage.run` | `Triage/Http.ts` | `TriageService.run` (SSE stream) |
| `triage.retriage` | `Triage/Http.ts` | `TriageService.retriage` (no SSE) |
| `triage.inbox` | `Triage/Http.ts` | `TriageService.inbox` |
| `actions.resolveApproval` | `Actions/Http.ts` | `AgentService.resolveApproval` |
| `actions.undo` | `Actions/Http.ts` | `ActionService.undoAction` |
| `chat.send` | `Chat/Http.ts` | `AgentService.chat` |

## What already matches

- `ActionService` is the sole ledger appender (`ActionLedgerRepo.append`).
- Toolkit handlers delegate mutations to `ActionService` (messenger pattern).
- `TriageService` alone maps batch outcomes to `TriageStreamEvent` SSE.
- Chat uses a separate HTTP group and `ChatStreamEvent` (not triage SSE).
