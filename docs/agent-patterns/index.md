---
type: Index
title: Agent Patterns Knowledge Bundle
description: Self-describing OKF knowledge index for agent patterns in agentic-inbox.
timestamp: 2026-07-21T22:07:26Z
---

# Agent Patterns Knowledge Bundle

Short, pointed distillations of how this repository works, formatted as a [Google Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle. Read the relevant concept file(s) before modifying an area — prefer these plus `repos/effect-smol/LLMS.md` over guessing or web search.

## Concepts & Patterns

### Effect & Library Idioms

- [effect-writing.md](./effect-writing.md) — Effect.gen / Effect.fn, avoid flatMap towers, Stream.mapEffect.
- [effect-httpapi.md](./effect-httpapi.md) — HttpApi groups, handlers, clients, branded params.
- [effect-config.md](./effect-config.md) — AppConfig, secrets, demo-mode env exception.
- [effect-schema.md](./effect-schema.md) — Schema.Class, TaggedError, NullOr vs optional.
- [effect-layers-services.md](./effect-layers-services.md) — Context.Service, Body vs Live, AppLive.

### Architecture & Application Structure

- [module-layout.md](./module-layout.md) — api-core vs apps/api vs web; Domain/Errors/Api/Http/Service/Repo.
- [repo-sql.md](./repo-sql.md) — Whole-entity repos, decodeSqlRow, ledger append.
- [agent-loop.md](./agent-loop.md) — TriageModel vs ToolModel, tool loop, approvals.
- [triage-ownership-seams.md](./triage-ownership-seams.md) — Attempt / InboxOrchestrator / TriageAgent / LedgerService ownership rules.
- [sensitive-policy.md](./sensitive-policy.md) — Never auto-action sensitive mail.
- [demo-mode.md](./demo-mode.md) — Missing DB/key → DemoAppLive.

### Web, Tooling & Governance

- [okf-documentation.md](./okf-documentation.md) — Mandatory standard requiring all documentation and wiki content to use Google OKF.
- [web-inbox-client.md](./web-inbox-client.md) — HttpApiClient, SSE exceptions, Next bridge.
- [skill-gen.md](./skill-gen.md) — `//<skill-gen>` fragments → `.agent/skills`.
- [ocr.md](./ocr.md) — Open Code Review path rules.
- [testing.md](./testing.md) — Vitest / Layer / ConfigProvider conventions.
- [dataset-and-ids.md](./dataset-and-ids.md) — `emails.json`, branded ids.
