# Agentic Inbox — Open Code Review rules (index)

Rules are split by path in `.opencodereview/rule.json`. OCR resolves the most specific matching rule per file.

| Rule file | Applies to |
|-----------|------------|
| [rules/base.md](rules/base.md) | Universal Agentic Inbox conventions |
| [rules/api-core.md](rules/api-core.md) | `packages/api-core/**` (branded params; declared errors; OpenAPI identifiers) |
| [rules/api.md](rules/api.md) | `apps/api/**` (Effect.fail vs die; AppConfig; whole-entity repos; Schema SQL row decode) |
| [rules/web.md](rules/web.md) | `apps/web/**` (HttpApiClient; api-core types) |
| [rules/design-system.md](rules/design-system.md) | `apps/web/src/design-system/**` |
| [rules/data.md](rules/data.md) | `data/**` |
| [rules/package-docs.md](rules/package-docs.md) | `**/README.md`, `**/AGENTS.md`, root `DESIGN.md` |

## Excluded from OCR scans

`.agent`, `.codex`, `.context`, `.cursor`, `.claude`, `.sentrux`, `.serena`, `.superpowers`, `vendor`, `repos`, `node_modules`, `.codegraph`, Next.js `.next`, build outputs, lockfiles.

## Operators

- Product scans: `ocr scan --audience agent` (agent dirs excluded automatically)
- Diff reviews: `ocr review --audience agent`
- Debug rule match: `ocr rules check <path>`
- Verify with `bun run test`, not `bun test`
