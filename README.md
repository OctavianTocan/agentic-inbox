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
- `apps/api`: optional Effect v4 backend (`@effect/platform-bun`), serving
  `/api/v1` on port 8001.
- `packages/api-core`: shared HTTP API contract/schemas for the backend.
- `packages/clients/ai-sdk`: Effect wrapper around the Vercel AI SDK (`ai`
  package) for LLM calls.
- Biome (lint/format), TypeScript 6, Vitest, lefthook for git hooks.

## Install & run

```bash
bun install
bun run dev        # apps/web on the Next.js dev server
bun run dev:api    # apps/api Effect backend on :8001 (optional, if used)
bun run typecheck
bun run lint
bun run test
bun run build
```

Or via the Justfile: `just dev`, `just api`, `just web`, `just build`,
`just test`, `just typecheck`, `just lint`, `just format`, `just ci`.

Copy `.env.example` to `.env.local` and fill in only the provider key(s) this
project actually uses (e.g. an OpenRouter or Anthropic/OpenAI key) before
running anything that calls an LLM.

## Data

The fixed 80-email dataset lives at `data/emails.json` (sanitized to valid
JSON — the original source file had a stray 2-byte prefix before the array).
Each record has `id`, `from`, `to`, `cc`, `subject`, `body`, `timestamp`,
`in_reply_to`. Treat this as a static snapshot; no new email arrives during
the exercise.

## Task brief

`docs/TASK.md` holds the full take-home task brief (requirements, timing,
deliverables). `DESIGN.md` holds the inherited design-system reference.
