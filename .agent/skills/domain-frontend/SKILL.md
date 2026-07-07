---
name: domain-frontend
description: "Use when working on React, frontend data fetching, UI components, routes, pages, apps/web, the app-local design system, inbox/audit screens, or AI chat UI."
---

# Frontend Development

General frontend conventions for this monorepo. Details live in [references/](references/) — see the routing tables at the bottom.

## Component Hierarchy

```
Primitives → Particles → Blocks → Features → Pages
```

| Tier | What | Where | Examples |
|------|------|-------|---------|
| **Primitives** | Single-element wrappers. One HTML element or Base UI primitive + cva + data-slot. No composition. | `design-system/components/ui/` | Button, Input, Card, Badge, Dialog |
| **Particles** | Behavior-enhanced controls. 1-3 primitives + one hook/interaction. Still "one control." | `apps/web/src/design-system/components/ui/` or `apps/web/src/design-system/hooks/` | CopyButton, shortcut hooks |
| **Blocks** | Multi-part compound families with layout contracts. 4-10 parts coordinated via data-slot. No data fetching. | `design-system/components/ui/` | SettingsCard, Empty, InputGroup, Field, Item |
| **Features** | App-specific interactive units. Own local state, API calls, shortcuts, or agent workflows. | `apps/web/src/components/{feature}/` and `apps/web/src/lib/{feature}/` | Inbox, audit, chat panel |
| **Pages** | Route-bound content modules. Full page UI with data fetching, forms, tables. | `apps/web/src/app/` delegates to `apps/web/src/components/{feature}/` | Inbox page, audit page |

## Package Layering

`apps/web/src/design-system` → `apps/web/src/ai-ui` / app components → route modules. Never import app-specific inbox/audit logic into the design-system layer.

| Package | Responsibility |
|---------|---------------|
| `apps/web/src/design-system` | Generic UI primitives, icon registry, providers, hooks, local utilities, and global styles. No inbox domain logic. |
| `apps/web/src/ai-ui` | Headless AI composer/thread primitives vendored for chat behavior. |
| `apps/web/src/components` | Product features such as inbox, audit, chat panel, and app-specific composed layouts. |
| `apps/web/src/app` | Next.js 16 App Router route files and route-bound server/client boundaries. |
| `packages/api-core` | Shared API contract/schemas consumed by web/API clients. |

## Where to Put New Code

| What | Where |
|------|-------|
| New UI primitive | `apps/web/src/design-system/components/ui/` |
| Behavior-enhanced generic hook/control | `apps/web/src/design-system/hooks/` or `apps/web/src/design-system/components/ui/` when reusable |
| AI chat primitive | `apps/web/src/ai-ui/` when headless; `apps/web/src/components/chat/` when product-specific |
| Inbox/audit product component | `apps/web/src/components/inbox/` or `apps/web/src/components/audit/` |
| Route-bound page wiring | `apps/web/src/app/` |
| Page-specific helper/type | colocate under the owning component folder, e.g. `components/inbox/filters.ts` |
| Shared API/client contract | `packages/api-core` for schemas, `apps/web/src/lib` for web-local adapters |
| Layout shell primitive | `apps/web/src/design-system/components/ui/sidebar.tsx` / `resizable.tsx` |

## File Organization

- **One component per file.** Every React component gets its own `.tsx` file, kebab-case.
- **Compound family exception.** A component family that is always imported together (e.g. `AppHeader` + all its parts) stays in one file.
- **Helpers and shared types extracted.** Pure helpers go in `lib/`, shared types in `types.ts` — not inline.
- **Module layout.** Pages and features use: `{module}/{module}-page.tsx`, `{section}-section.tsx`, `components/`, `hooks/`, `lib/`, `types.ts`.
- **Nested component subfolders.** When a component owns 1+ children, group them in a subfolder named after the parent; children drop the parent prefix and can nest recursively.

Imports use the app-local `@/...` alias, with design-system imports from `@/design-system/...`, AI primitives from `@/ai-ui/...`, and product code from `@/components/...` or `@/lib/...`. Never import through package barrels — see `AGENTS.md` for the canonical rule.

## Decision Trees

| Question | Answer |
|----------|--------|
| How to fetch this data? | Static dataset/derived inbox state → app-local adapters under `apps/web/src/lib/{feature}`. Backend data → shared contracts in `packages/api-core` and web-local calls from `apps/web/src/lib`. See [data-fetching.md](references/data-fetching.md) only when adding new server interactions. |
| How to write this data? | For the take-home inbox, write through the existing triage/action APIs or local reducers; keep simulated actions legible and reversible. New backend writes need a `packages/api-core` contract first. |
| How to manage this state? | Route/page state → Next route/search params when it must survive links; global product panel state → owning shell component; scoped subtree state → React context; component-local → `useState`. |
| What dialog component? | Multi-field content/form → `HybridDialog`. Simple destructive yes/no → `HybridAlertDialog`. See [dialogs.md](references/dialogs.md). |
| Where does this component go? | Check the Component Hierarchy table above. When in doubt → page-specific → `apps/web/src/components/{feature}/`. |
| What's the canonical shape of X? | See [common-patterns.md](references/common-patterns.md) — component, hook, mutation, form, dialog, icons, toasts, nav, url-state, zustand, shortcuts, tooltips. |

## React-Specific Naming

- **Event handlers.** `handle*` for component-internal (`handleSubmit`, `handleClose`); `on*` for callback props (`onSubmit`, `onChange`).
- **Component size.** Aim under 150 lines. Over 300 means extract sub-components or hooks.
- **Hook return types.** Annotate when returning an object/tuple with 3+ members; inference is fine for 1–2.

For booleans, constants, JSDoc, function structure, and other universal TypeScript rules, see `practice-code-quality`.

## References

| Reference | Use when |
|-----------|----------|
| [common-patterns.md](references/common-patterns.md) | You need the canonical shape of something fast — component, app-local API read/write, form, dialog, state branching, icons, toasts, navigation, URL state, zustand, shortcuts, tooltips |
| [page-anatomy.md](references/page-anatomy.md) | Adding a new Next.js route or route-backed view |
| [app-wiring.md](references/app-wiring.md) | Understanding how the app is assembled (providers, layout, routes, inbox/audit shells) |
| [component-anatomy.md](references/component-anatomy.md) | Creating or modifying a component (props, data-slot, cva, cn(), render prop, named exports, compound families) |
| [component-catalog.md](references/component-catalog.md) | Checking whether a component already exists |
| [design-system.md](references/design-system.md) | Building new design system components (app-local `ui/`, hooks, Base UI integration) |
| [dialogs.md](references/dialogs.md) | Adding a dialog or modal |
| [forms.md](references/forms.md) | Adding or editing a form (react-hook-form + zod) |
| [tables.md](references/tables.md) | Displaying data in a table (manual Table or DataTable) |
| [data-table-filter.md](references/data-table-filter.md) | Adding a faceted filter bar or URL-persisted filter state |
| [animation.md](references/animation.md) | Adding animations — single source of motion rules (philosophy, durations, easings, springs, AnimatePresence, tw-animate-css) |
| [ui-constraints.md](references/ui-constraints.md) | Reviewing or finalizing any UI — pre-ship checklist plus MUST/SHOULD/NEVER rules and anti-patterns |
| [data-fetching.md](references/data-fetching.md) | Reading or writing server data through app-local clients, API contracts, SSE streams, and error surfaces |
| [error-handling.md](references/error-handling.md) | Surfacing server/auth errors in UI |
| [nextjs.md](references/nextjs.md) | Working on `apps/web` Next.js App Router files |
| [chat-tool-blocks.md](references/chat-tool-blocks.md) | Adding or modifying chat/tool-result UI components |
| [frontend-testing.md](references/frontend-testing.md) | Writing frontend tests (vitest + jsdom, mocking) |
