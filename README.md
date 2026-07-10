# Agentic Inbox

Agentic Inbox is a local shared-inbox workspace. An AI agent sorts a fixed set
of sample messages, handles routine follow-ups, and holds sensitive work for a
human review. Every action has a plain-language rationale and a reversible
ledger entry.

## What it does

- Runs batch triage with live progress over SSE.
- Files routine updates and drafts short acknowledgements when appropriate.
- Pauses financial, dispute, safety, escalation, legal, and low-confidence
  messages for explicit review.
- Supports edited approvals, denial, undo, re-triage, and an inbox chat panel.

## Stack

- Bun workspace with a Next.js 16 frontend and Effect v4 API.
- PostgreSQL 17 for decisions, actions, and conversation history.
- OpenRouter-backed model calls, configured through `.env`.

## Run locally

```bash
cp .env.example .env
bun install
just up
just db-migrate
just api
just web
```

The API runs on port 8001 and the web app on port 3003 by default. The test
database is `agentic_inbox_test`; it is separate from the local development
database.

## Validation

```bash
bun run typecheck
bun run lint
bun run test
```
