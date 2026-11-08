---
type: Agent Pattern
title: Repository & SQL Row Decoding
description: Persistence layer rules, whole-entity aggregates, append-only action ledgers, and decodeSqlRow.
tags: [repo, sql, database, decode, persistence]
timestamp: 2026-07-21T22:07:26Z
---

# Repo & SQL decode (agentic-inbox)

Not Effect `SqlSchema` helpers — use `decodeSqlRow` + `Schema.encodeKeys`.

Anchors: `Infrastructure/Database/DecodeSqlRow.ts`, `Triage/Decisions/Repo.ts`, `Actions/Repo.ts`, `Chat/Repo.ts`.

## Mutable aggregates

Whole-entity only: `create` / `upsert`, `get` / `list*`, `deleteByEmail` / `deleteAll`.
Services mutate in memory, then upsert. **No** `updateStatus` / `setPending` field writers.
Atomic CAS is OK when required (`ConversationsRepo.claimApproval`).

## Append-only ledger

`ActionLedgerRepo`: `append` (+ reads / wipe). Idempotency `(run_id, action, action_revision)`.
Undo inserts a new row and stamps `undone_by` in one transaction.

## Row decode

```ts
const FromRow = Domain.pipe(Schema.encodeKeys({ emailId: 'email_id', … }))
const decode = decodeSqlRow(FromRow)           // sync — intentional at repo edge
const decode = decodeSqlRow(FromRow, ['error']) // TEXT JSON columns
```

- SQL NULL → `Schema.NullOr(X)` (not bare `optional`).
- Do not strip nulls before decode.
- Sync decode **only** in repos; handlers/agent loops stay Effectful.

## Avoid

Hand-mapping rows with `as` / `new Domain({ emailId: row.email_id })`.
Exposing persistence CRUD over HTTP.
