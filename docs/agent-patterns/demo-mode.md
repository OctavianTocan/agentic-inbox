---
type: Agent Pattern
title: Demo Mode
description: Fallback behavior and environment gating when database or AI credentials are absent.
tags: [demo, runtime, environment, layers]
timestamp: 2026-07-21T22:07:26Z
---

# Demo mode (agentic-inbox)

Anchors: `runtime-mode.ts`, `Modules/Demo/Layers.ts`, `WebHandler.ts`.
Also noted in `effect-config.md` (Next bundling exception).

## Gate

`isDemoMode()` when `DATABASE_URL` **or** `OPENROUTER_API_KEY` is missing/blank.
Must use dynamic `process.env[name]` so Turbopack cannot bake `.env` into the server bundle.
Do **not** replace with Effect Config.

## Behavior

`createApiWebHandler` picks `DemoAppLive` vs `AppLive`.

Demo layers (`Layer.succeed`):

- Triage: seeded `DemoInbox`; `run` emits empty `done`; `retriage` → `EmailNotFound`
- Actions: list demo ledger; mutations `Effect.die` / not-found
- Agent: triage/chat die; resolve → `ApprovalNotFound`

Same HttpApi routes + Scalar docs; no Postgres / OpenRouter.

## Tests

Mutate `process.env` only for this gate; prefer `ConfigProvider` for real AppConfig knobs.
