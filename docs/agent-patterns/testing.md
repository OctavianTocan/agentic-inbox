---
type: Agent Pattern
title: Testing Conventions
description: Test execution commands, layer isolation with fakes, ConfigProvider overrides, and mock conventions.
tags: [testing, vitest, vitest-run, mocks, layers]
timestamp: 2026-07-21T22:07:26Z
---

# Testing (agentic-inbox)

## Commands

- Prefer `bun run test` / workspace scripts — not bare `bun test` (OCR + CI expect the wrapper).
- API: `bun run --cwd apps/api test` or `bunx vitest run --project api`.
- Web: `bunx vitest run --project web`.

## Patterns

- Layer tests: provide `*Body` with fakes / test DB; avoid constructing services with `new`.
- Config: `ConfigProvider.layer(ConfigProvider.fromUnknown({ … }))` for AppConfig knobs.
- Demo gate: mutate `process.env` only for `isDemoMode` / bundling tests (`demo-mode.md`).
- HTTP: prefer typed client or handler tests against declared errors, not status-string sniffing.

## Avoid

Skipping policy / approval cases when changing agent or Actions code.
Hand-editing OpenAPI or generated skills to “fix” tests — regenerate instead.
