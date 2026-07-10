# Agentic Inbox — apps/web (Next.js frontend)

Apply **base.md** conventions plus:

Next.js 16 App Router product UI. Design tokens/primitives: see **design-system.md**.

## Do NOT flag

- App-local imports: `@/design-system/...`, `@/ai-ui/...`, `@/components/...`, `@/lib/...`
- Feature folders under `components/{inbox,audit,chat}` and adapters under `lib/{inbox,chat}`
- Headless AI composer/thread code in `ai-ui/`
- Default exports only for `app/**/page.tsx`, `layout.tsx`, `route.ts`
- Proxying API via `AGENTIC_INBOX_API_ORIGIN` + `/api/v1` rewrites (origin only in env)

## DO flag

- Inbox/audit/chat domain logic imported into `design-system/`
- New UI primitives invented under `components/` when an equivalent exists in `design-system/components/ui/`
- Hiding or omitting agent rationale / decision / ledger state the reviewer needs for a ~5-minute triage pass
- Auto-action UI without an obvious undo / re-triage control
- Treating mock/static email ids as a live mailbox (pagination, “load more”, sync from provider)
- Redefining api-core wire types locally instead of importing `@app/api-core/...`
- Icons from `@hugeicons/*` or `lucide-react` outside `@/design-system/components/icons`
- Client components fetching with secrets; shipping `OPENROUTER_API_KEY` to the browser
- Components > ~300 lines mixing data fetching, layout, and interaction without extraction
- Route/search state that should survive links kept only in ephemeral React state (when the existing pattern uses URL state)
