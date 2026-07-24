---
type: Agent Pattern
title: Dataset & Branded IDs
description: Static inbox sample dataset and branded domain IDs.
tags: [dataset, ids, domain, schemas, fixtures]
timestamp: 2026-07-21T22:07:26Z
---

# Dataset & ids (agentic-inbox)

Anchors: `data/emails.json`, `packages/api-core` branded ids, `apps/api/src/Lib/Ids.ts`.

## Sample inbox

- Static dataset `data/emails.json` — ids `e-001` … `e-080`.
- Seed / demo paths load this set; do not invent parallel fixture id schemes in UI mocks without matching shapes.

## Branded ids

| Id | Where |
|----|--------|
| `EmailId` | Emails domain; triage / inbox path params |
| `ApprovalId` | Actions approvals |
| `LedgerEntryId` | Action ledger rows |

HttpApi path params use these brands (`effect-httpapi.md`), not bare `Schema.String`.
App code may alias brands via `Lib/Ids.ts` for local convenience — keep wire brands in api-core.

## Avoid

Hard-coding production secrets in fixtures; mirroring wire types in web instead of importing api-core.
