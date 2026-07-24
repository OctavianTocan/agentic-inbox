---
type: Agent Pattern
title: Triage ownership seams
description: Who mints attempt ids, who appends the ledger, who owns pause/resume and SSE — with the Attempt / InboxOrchestrator / TriageAgent naming bundle.
tags: [triage, ownership, seams, architecture, attempt]
timestamp: 2026-07-23T11:48:00Z
---

# Triage ownership seams (agentic-inbox)

Canonical vocabulary: root [`GLOSSARY.md`](../../GLOSSARY.md). Wayfinder map: `.scratch/triage-ownership-seams/`.

Code may still use old symbols (`TriageService`, `ActionService`, `runId`, `Decision`, `Proposal`) until rename. Prefer the new names in new docs and rules.

## Ownership

| Owner | Owns | Must not |
| --- | --- | --- |
| InboxOrchestrator (today `TriageService`) | Mint `attemptId`; create/upsert Attempt rows + `pending`; persist Classification from agent outcome; triage SSE; inbox; wipe | Model tool loop; ledger SQL |
| TriageAgent (today `AgentService.triageEmail`) | One-email walk; call LedgerService for effects; return completed \| interrupted | Mint attempt id; emit SSE; touch attempt/ledger/classification repos directly |
| LedgerService (today `ActionService`) | Append ledger; HTTP undo | Attempt identity; SSE |
| Toolkit | Effect AI adapter → LedgerService | Domain ownership; SQL; mint ids; SSE |
| ChatAgent | Free-form chat | Triage resume key; minting Attempts |

## Hard rules

1. Only InboxOrchestrator mints `attemptId` / `threadId` (wire may still say `runId`).
2. Only LedgerService appends `action_ledger`.
3. Only InboxOrchestrator writes Attempt rows and Classifications from agent outcomes.
4. Triage resume key is `attemptId` (=== `threadId`); pause payload on the Attempt (`interrupted` + `pending`).
5. Only InboxOrchestrator emits triage SSE.
6. TriageAgent must not talk to ledger / attempt / classification repos directly.
7. ChatAgent must not define the triage resume path.

## Related

- [agent-loop.md](./agent-loop.md) — today’s TriageAgent walk inside `Agent/Service.ts`
- [module-layout.md](./module-layout.md) — package and sub-module layout
- [Freeze the TriageEngine Effect seam](../../.scratch/agentic-inbox-v2/issues/02-freeze-triage-engine-seam.md) — role split (labels updated by naming bundle)
