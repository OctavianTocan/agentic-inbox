# Agentic Inbox — base review rules

Bun workspace: Next.js frontend (`apps/web`), Effect v4 API (`apps/api`), shared HTTP contracts (`packages/api-core`), static sample inbox (`data/emails.json`).

## Product invariants (always apply)

- Sensitive emails must never be auto-actioned (financial / dispute / safety / escalation, low confidence, or body keyword gates).
- Every agent action must be legible in plain language per email.
- Wrong auto-actions must be cheaply reversible (undo / re-triage is first-class).
- Dataset is static: 80 emails, ids `e-001`..`e-080` — no live mail, pagination, or streaming inbox.

## Do NOT flag

- `workspace:*` / catalog pins; Effect v4 beta (`4.0.0-beta.*`) from the root catalog
- `effect/unstable/http` + `effect/unstable/httpapi`; `Context.Service` (not `Effect.Service`)
- Named exports everywhere except Next.js `page` / `layout` / `route` defaults
- Tests under package-level `test/` (not colocated next to source)
- Health at `GET /api/v1/health`, OpenAPI/docs at `/docs`; API port `8001`, web via `WEB_PORT`
- `bun run test` / `bun run ci` — not bare `bun test`
- Frontend-only AI experiments kept in `apps/web` until a backend path is chosen
- Read-only `repos/effect-smol` subtree as Effect reference (do not import from it in app code)

## DO flag

- Effect v3 installs or mixed Effect major versions
- Type casts (`as`, `as any`, `as unknown as`, non-null `!`) at trust boundaries; TypeScript `enum`
- Default exports outside Next.js route/page/layout files
- Imports through `index.ts` barrels (import the concrete file); icons imported from `@hugeicons/*` / `lucide-react` outside the design-system icon registry
- Schemas/handlers/UI that auto-send, promise, or commit on sensitive mail without human approval
- Auto-actions without an undo / re-triage path
- Live IMAP/Gmail integration, pagination, or treating `data/emails.json` as mutable production mail
- Secrets in source, docs, fixtures, or logs (`OPENROUTER_API_KEY`, DB URLs with credentials in committed files)
- Missing regression tests for behavioral triage / policy / undo fixes
- Files mixing Domain schemas, Errors, Service/Layer, and I/O adapters past ~300 lines without a split
- Per-field mutable-repo writers (`updateStatus`, `setPending`, …) — upsert the whole entity; nest a second aggregate as `Module/Sub/`

## TypeScript

- No casts at trust boundaries; no `enum`; max 2 positional params (use options objects)
- JSDoc: caller contract on exports; one-line summary on private helpers
- Derive types from source (`Schema.Type`, `$inferSelect`, etc.)
