# Agentic Inbox — design-system

Apply **base.md** and **web.md** conventions plus:

`apps/web/src/design-system` is generic UI only: primitives, particles, blocks, icon registry, providers, hooks, styles.

## Do NOT flag

- Hierarchy: Primitives → Particles → Blocks (no data fetching in blocks)
- Icon registry as the sole approved `@hugeicons/*` import site
- `cn` / cva / `data-slot` patterns already used by existing primitives

## DO flag

- Inbox, audit, triage, ledger, or email domain types/logic inside design-system
- New primitive that duplicates an existing `components/ui/*` control
- Feature-level composition (API calls, agent workflows, inbox shortcuts) living here instead of `apps/web/src/components/{feature}/`
- Direct `@hugeicons/react`, `@hugeicons/core-free-icons`, or `lucide-react` imports from app feature code (must go through the icon registry)
- One-off styling that fights `DESIGN.md` tokens without an explicit design-system change
