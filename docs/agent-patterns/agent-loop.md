---
type: Agent Pattern
title: Agent Loop
description: Two model roles, TriageAgent and ChatAgent flows, and tool-loop conventions.
tags: [agent, triage, loop, models, approvals]
timestamp: 2026-07-24T08:12:00Z
---

# Agent loop (agentic-inbox)

Anchors: `Modules/Agent/TriageAgent.ts`, `ChatAgent.ts`, `Loop.ts`, `Model.ts`, `Toolkit.ts`, `Prompts.ts`.

Ownership and naming: [triage-ownership-seams.md](./triage-ownership-seams.md), root [`GLOSSARY.md`](../../GLOSSARY.md).

## Two model roles

| Tag | Use |
|-----|-----|
| `TriageModel` | `generateObject` Classification (`strictJsonSchema`, response-healing) |
| `ToolModel` | `generateText` tool loop (`Tool.Strict` per tool) |

Keep tags separate so tests can fake either. Do not drive tools with triage model config.

## Flow (`TriageAgent.triageEmail`)

1. Generate Classification → normalize + `isSensitive(policy)`.
2. `runLoop` with `makeTriageToolkit` until no tools / approval / `MAX_AGENT_TURNS` (6).
3. Pending approval → legacy conversation `awaiting_approval` (target: Attempt `interrupted` + `pending`); else complete.
4. Diff ledger before/after → acted events for InboxOrchestrator SSE.

InboxOrchestrator mints `attemptId`, persists Classification and Attempt rows, and builds SSE.

## ChatAgent

`chat` and legacy `resolveApproval` (conversation `approvalId`). Target triage resume is by `attemptId` on the Attempt.

## Avoid

Sync Schema decode in the loop hot path; skipping policy when stamping `isSensitive`;
scattering OpenRouter client setup outside `Model.ts`; dual Classification writers.
