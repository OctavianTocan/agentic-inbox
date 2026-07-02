# Cogram Agentic Inbox

Take-home project: a web app where an AI agent autonomously processes an AEC
(architecture/engineering/construction) project email inbox of 80 emails. The
agent auto-handles routine traffic (RFIs, daily reports, submittals, vendor
quotes, schedule pings), defers anything sensitive (change orders, claims and
disputes, safety incidents, owner escalations) to the human, and surfaces what
it did, what needs attention, and why — with easy recovery from wrong calls.
See `docs/TASK.md` for the full task brief.

## Stack

Inherited from the `cogram-ai-app-template` base:

- Bun workspace (`apps/*`, `packages/**/*`), package manager `bun@1.3.14`.
- `apps/web`: Next.js 16 App Router frontend, React 19, Tailwind CSS 4, a
  vendored design system under `apps/web/src/design-system`, and headless AI
  message/composer primitives under `apps/web/src/ai-ui`.
- `apps/api`: Effect v4 backend (`@effect/platform-bun`), serving `/api/v1` on
  port 8001, with Postgres persistence via `@effect/sql-pg`.
- `packages/api-core`: shared HTTP API contract/schemas for the backend.
- PostgreSQL 17 for the action ledger, decisions, and conversation history
  (run locally via docker-compose).
- LLM calls go through OpenRouter (`OPENROUTER_MODEL`, default
  `openai/gpt-5.5`).
- Biome (lint/format), TypeScript 6, Vitest, lefthook for git hooks.

## Install & run

```bash
cp .env.example .env      # then fill in OPENROUTER_API_KEY
bun install
just up                   # start Postgres (docker) and wait until healthy
just db-migrate           # apply DB migrations
bun run dev:api           # apps/api Effect backend on :8001
bun run dev               # apps/web on the Next.js dev server (:3003)
```

The database runs in Docker; the api and web apps run on the host via Bun.
`DATABASE_URL` in `.env` matches the compose Postgres service.

### Database (docker-compose)

| Recipe | What it does |
| --- | --- |
| `just up` | Start the Postgres dev database (detached) and wait until healthy |
| `just down` | Stop the stack, keeping the data volume |
| `just db-clean` | Stop the stack and delete the data volume |
| `just db-migrate` | Apply pending migrations against the running database |
| `just db-reset` | Wipe the volume, recreate the database, and re-migrate |

A fully containerized stack (db + api + web) is available behind a profile:

```bash
docker compose --profile full up -d --build
```

### Other recipes

`just dev`, `just api`, `just web`, `just build`, `just test`, `just typecheck`,
`just lint`, `just format`, `just ci` all delegate to the matching `bun run`
scripts.

## Data

The fixed 80-email dataset lives at `data/emails.json` (sanitized to valid
JSON — the original source file had a stray 2-byte prefix before the array).
Each record has `id`, `from`, `to`, `cc`, `subject`, `body`, `timestamp`,
`in_reply_to`. Treat this as a static snapshot; no new email arrives during
the exercise.

## Task brief

`docs/TASK.md` holds the full take-home task brief (requirements, timing,
deliverables). `DESIGN.md` holds the inherited design-system reference.
