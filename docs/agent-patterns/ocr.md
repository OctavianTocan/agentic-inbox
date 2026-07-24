---
type: Agent Pattern
title: Open Code Review (OCR)
description: Rules, commands, path configurations, and audience flags for Open Code Review scans.
tags: [ocr, review, lint, tools]
timestamp: 2026-07-21T22:07:26Z
---

# Open Code Review — OCR (agentic-inbox)

**OCR = Open Code Review**, not optical character recognition.

Anchors: `.opencodereview/review-rules.md`, `rules/{base,api-core,api,web,design-system,data,package-docs}.md`.

## Usage

- Product scan: `ocr scan --audience agent`
- Diff review: `ocr review --audience agent`
- Debug match: `ocr rules check <path>`
- Verify with `bun run test` (not bare `bun test`)

## Path rules (high signal)

| Path | Emphasizes |
|------|------------|
| `api-core` | Branded params, declared errors, OpenAPI identifiers, NullOr for SQL |
| `apps/api` | Effect.fail vs die, Effect.fn/gen (no flatMap towers), whole-entity repos, decodeSqlRow, sensitive gate, AppConfig |
| `apps/web` | HttpApiClient, no mirrored wire types, design-system boundaries |

Excluded: `.agent`, `repos`, `node_modules`, build outputs, etc.

When fixing review findings, prefer these rules + `docs/agent-patterns/` over inventing new house style.
