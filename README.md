# Cogram Agentic Inbox

Take-home project: a web app where an AI agent autonomously processes an AEC
(architecture/engineering/construction) project email inbox of 80 emails. The
agent auto-handles routine traffic (RFIs, daily reports, submittals, vendor
quotes, schedule pings), defers anything sensitive (change orders, claims and
disputes, safety incidents, owner escalations) to the human, and surfaces what
it did, what needs attention, and why — with easy recovery from wrong calls.
See `docs/TASK.md` for the full task brief.

## What the agent does

- **Batch triage.** On a triage run the agent decides an action for each of the
  80 emails and either auto-executes it (routine) or pauses for approval
  (sensitive). Progress streams live over SSE with per-row spinners.
- **Sensitive mail is never auto-actioned.** A deterministic policy gate (not a
  model call) forces approval for sensitive categories, low-confidence
  decisions, and raw-body danger signals (money, legal, safety/injury,
  litigation-hold, escalation). Sensitive mail is drafted and paused, not sent.
- **Approvals.** Pending approvals are pinned at the top of the inbox with
  inline Approve / Deny. Reviewers can edit the drafted reply before approving;
  the edited body is what ships (simulated).
- **Undo.** Every action is an append-only ledger entry; undo retracts a
  simulated send and drops the email back to Needs Attention.
- **Re-triage.** Re-run one email from the row context menu
  (`POST /triage/:id/retriage`), or re-run the whole inbox fresh
  (`POST /triage/run` with `fresh: true`, which clears prior triage state first).
- **Chat sidepanel.** The same agent/toolkit answers questions and runs
  commands (e.g. "undo the reply to Rachel").

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

Docker must be running (for Postgres). From a clean checkout:

```bash
cp .env.example .env      # then fill in OPENROUTER_API_KEY
bun install               # also applies the next-themes patch (see below)
just up                   # start Postgres (docker) and wait until healthy
just db-migrate           # apply DB migrations
just api                  # apps/api Effect backend on :8001
just web                  # apps/web on the Next.js dev server (:3003)
```

Run `just api` and `just web` in separate terminals. Use these `just` recipes
rather than bare `bun run dev:api` / `bun run dev`: the recipes `set -a; . ./.env`
so `DATABASE_URL`, `COGRAM_API_ORIGIN`, `WEB_PORT`, and `OPENROUTER_API_KEY`
load from `.env`; a bare `bun run` does not source `.env` and will miss them.

The database runs in Docker; the api and web apps run on the host via Bun.
`DATABASE_URL` in `.env` matches the compose Postgres service.

**Ports.** API is `:8001` (override with `PORT` in `.env`); web is `:3003`
(override with `WEB_PORT`). `COGRAM_API_ORIGIN` points web at the API origin;
Next rewrites add the `/api/v1` prefix.

**Patches.** `patches/next-themes@0.4.6.patch` is registered in `package.json`
under `patchedDependencies`; Bun applies it during `bun install`. A fresh
checkout must run `bun install` for the patch to take effect.

**Health check.** `curl http://127.0.0.1:8001/api/v1/health` returns `204` once
the API is up. If it 404s, the API process is serving a stale contract — the
`bun --watch` dev runner has been observed to go stale on contract changes;
restart `just api` to pick them up.

### Test database

The api test suite truncates every table between cases, so it runs against a
dedicated `cogram_test` database (`TEST_DATABASE_URL` in `.env.example`), never
the live `cogram`. On a fresh Docker volume the `docker/postgres-init` script
creates `cogram_test` automatically on first boot. If you already have a
Postgres volume from before this script existed, create it once:

```bash
docker compose exec db createdb -U cogram cogram_test
```

Then run migrations and tests:

```bash
just db-migrate           # migrates the live DB; the test suite migrates cogram_test itself
just test                 # bun run test (vitest across the workspace)
just typecheck            # bun run typecheck
just lint                 # biome check .
```

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
