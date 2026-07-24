---
type: Agent Pattern
title: Agent Loop
description: Two model roles, triage flow, approval handlers, and execution loop conventions.
tags: [agent, triage, loop, models, approvals]
timestamp: 2026-07-21T22:07:26Z
---

# Agent loop (agentic-inbox)

Anchors: `Modules/Agent/Service.ts` (TriageAgent + ChatAgent today), `Model.ts`, `Toolkit.ts`, `Prompts.ts`.

Ownership and naming: [triage-ownership-seams.md](./triage-ownership-seams.md), root [`GLOSSARY.md`](../../GLOSSARY.md).

## Two model roles

| Tag | Use |
|-----|-----|
| `TriageModel` | `generateObject` Classification (`strictJsonSchema`, response-healing) |
| `ToolModel` | `generateText` tool loop (`Tool.Strict` per tool) |

Keep tags separate so tests can fake either. Do not drive tools with triage model config.

## Flow (`triageEmail` — TriageAgent)

1. `generateDecision` → structured object → `normalizeDecision` + `isSensitive(policy)`.
2. `runLoop` with `makeTriageToolkit(decision.isSensitive)` until no tools / approval / `MAX_AGENT_TURNS` (6).
3. Pending approval → legacy conversation `awaiting_approval` (target: Attempt `interrupted` + `pending`); else `complete`.
4. Diff ledger before/after → `TriageActed` events for InboxOrchestrator SSE.

InboxOrchestrator mints `attemptId`, persists Classification and Attempt rows, and builds SSE — see ownership seams.

## Approvals

Legacy: `resolveApproval` via `approvalId` on conversations.
Target: resume by `attemptId` on the Attempt; ChatAgent off the triage resume path.

## Avoid

Sync Schema decode in the loop hot path; skipping policy when stamping `isSensitive`;
scattering OpenRouter client setup outside `Model.ts`; dual Classification writers (`record_triage` plus orchestrator upsert).
