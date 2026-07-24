---
type: Agent Pattern
title: Triage ownership seams
description: Who mints attempt ids, who appends the ledger, who owns pause/resume and SSE — Attempt / InboxOrchestrator / TriageAgent / LedgerService / ChatAgent.
tags: [triage, ownership, seams, architecture, attempt]
timestamp: 2026-07-24T08:10:00Z
---

# Triage ownership seams (agentic-inbox)

Canonical vocabulary: root [`GLOSSARY.md`](../../GLOSSARY.md). Wayfinder map: `.scratch/triage-ownership-seams/`.

## Ownership

| Owner | Path | Owns | Must not |
| --- | --- | --- | --- |
| InboxOrchestrator | `Modules/Triage/Service.ts` | Mint `attemptId`; Attempt lifecycle + `pending`; persist Classification; triage SSE; inbox; wipe | Model tool loop; ledger SQL |
| TriageAgent | `Modules/Agent/TriageAgent.ts` | One-email walk; call LedgerService; return completed \| interrupted | Mint attempt id; emit SSE; touch attempt/ledger/classification repos |
| ChatAgent | `Modules/Agent/ChatAgent.ts` | Chat; legacy approval resume | Mint Attempts; long-term triage resume key |
| LedgerService | `Modules/Actions/Service.ts` | Append ledger; HTTP undo | Attempt identity; SSE |
| Toolkit | `Modules/Agent/Toolkit.ts` | Effect AI adapter → LedgerService | Domain ownership; SQL; mint ids; SSE |

## Folders

| Aggregate | Folder |
| --- | --- |
| Attempts | `Triage/Attempts/` + `api-core/.../Triage/Attempts/` |
| Classifications | `Triage/Classifications/` |
| Ledger repo | `Actions/Repo.ts` (`LedgerRepo`) |

SQL table names stay `triage_runs`, `decisions`, `action_ledger` until a migration renames them.

## Hard rules

1. Only InboxOrchestrator mints `attemptId` / `threadId`.
2. Only LedgerService appends `action_ledger`.
3. Only InboxOrchestrator writes Attempt rows and Classifications from agent outcomes.
4. Triage resume key is `attemptId` (=== `threadId`); pause payload on the Attempt.
5. Only InboxOrchestrator emits triage SSE.
6. TriageAgent must not talk to ledger / attempt / classification repos directly.
7. ChatAgent must not define the triage resume path.

## Related

- [agent-loop.md](./agent-loop.md) — TriageAgent / ChatAgent loops
- [module-layout.md](./module-layout.md) — package and sub-module layout
