# App Wiring

How the current app is assembled: one Next.js 16 frontend, an app-local design system, product components, and API proxy routes.

## Boot Sequence

```
apps/web/src/app/layout.tsx
  └── DesignSystemProvider
      ├── ReactGrabSetup in development
      └── route content
```

`RootLayout` owns fonts, metadata, global background/text tokens, and the design-system provider. Keep feature providers closer to the feature shell unless they truly affect every route.

## Route Hierarchy

```
apps/web/src/app/page.tsx          → InboxShell
apps/web/src/app/audit/page.tsx    → AuditPage
apps/web/src/app/api/v1/*          → API proxy routes
apps/web/src/app/design/*          → design-system preview/demo surfaces
apps/web/src/app/traces/*          → traces/debug route surfaces
```

Route files should stay thin: read server-only request context such as cookies, parse persisted layout values, then delegate to product components under `apps/web/src/components`.

## Product Shells

- `InboxShell` owns the main reviewer workflow: inbox list, detail pane, triage controls, chat panel, sidebar width, and keyboard shortcuts.
- `AuditPage` reuses the inbox sidebar/detail/chat layout patterns for audit review.
- `InboxSidebar` is the shared sidebar composition; design-system `Sidebar` remains generic and domain-free.
- `ChatSlot` and `apps/web/src/ai-ui` compose headless chat primitives with app-specific transport logic under `apps/web/src/lib/chat`.

## Data Seams

- UI-facing inbox calls go through `apps/web/src/lib/inbox/client.ts`.
- UI-facing chat streaming goes through `apps/web/src/lib/chat/http-transport.ts`.
- Shared HTTP schemas/contracts belong in `packages/api-core`.
- Backend handlers live in `apps/api`; web API route files only proxy or adapt when needed.

## Adding a New Wired Feature

1. Create route wiring under `apps/web/src/app/{route}/page.tsx` when the URL changes.
2. Put product UI under `apps/web/src/components/{feature}/`.
3. Put web-local adapters/helpers under `apps/web/src/lib/{feature}/`.
4. Add shared API schemas in `packages/api-core` before adding backend/web callers.
5. Keep reusable primitives in `apps/web/src/design-system`, with no product imports.

## Key Files

- `apps/web/src/app/layout.tsx` — root provider/metadata/font shell
- `apps/web/src/app/page.tsx` — inbox route wiring
- `apps/web/src/app/audit/page.tsx` — audit route wiring
- `apps/web/src/components/inbox/inbox-shell.tsx` — main inbox shell
- `apps/web/src/components/audit/audit-page.tsx` — audit shell
- `apps/web/src/lib/inbox/client.ts` — inbox API client seam
- `apps/web/src/lib/chat/http-transport.ts` — chat SSE transport
- `apps/web/src/design-system/providers/index.tsx` — DesignSystemProvider
