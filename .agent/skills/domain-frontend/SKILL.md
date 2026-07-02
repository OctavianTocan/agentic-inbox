---
name: domain-frontend
description: "Use when working on React, frontend data fetching, UI components, routes, pages, apps/app, apps/web, apps/admin, apps/mobile, apps/desktop, packages/ui, app-core, app-shared, or sync UI."
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
| **Particles** | Behavior-enhanced controls. 1-3 primitives + one hook/interaction. Still "one control." | `design-system/components/particles/` | CopyButton, ThemeToggle |
| **Blocks** | Multi-part compound families with layout contracts. 4-10 parts coordinated via data-slot. No data fetching. | `design-system/components/ui/` | SettingsCard, Empty, InputGroup, Field, Item |
| **Features** | Global interactive units. Own store, API calls, shortcuts. Not route-bound. | `app-core/features/{feature}/` | SearchDialog, FeedbackDialog, SessionPanel |
| **Pages** | Route-bound content modules. Full page UI with data fetching, forms, tables. | `app-core/pages/{page}/` | BillingPage, MembersPage |

## Package Layering

`design-system` → `app-shared` → `app-core` → `apps/*`. Never import upward.

| Package | Responsibility |
|---------|---------------|
| `packages/ui/design-system` | Generic UI primitives, particles, and blocks. No business logic. |
| `packages/comcom/app-shared` | Cross-platform data hooks, router abstraction, utilities. Used by mobile + desktop. |
| `packages/comcom/app-core` | Pages (`pages/`), features (`features/`), layout (`components/layout/`), shared hooks and utilities. |
| `apps/app` | Thin Vite + TanStack Router shell. Pages are minimal wiring. |
| `apps/web` | Next.js marketing site. |
| `apps/admin` | Next.js admin dashboard. |

## Where to Put New Code

| What | Where |
|------|-------|
| New UI primitive | `design-system/components/ui/` |
| Behavior-enhanced control (particle) | `design-system/components/particles/` |
| Global UI feature (store + API + shortcuts) | `app-core/features/{feature}/` |
| Route-bound page content | `app-core/pages/{page}/` |
| Page section | `app-core/pages/{page}/{section}-section.tsx` |
| Page sub-component | `app-core/pages/{page}/components/` |
| Page-specific helper/type | `app-core/pages/{page}/lib/` |
| Cross-platform data hook | `packages/comcom/app-shared/src/hooks/` |
| Layout shell primitive | `design-system/components/ui/` |
| Layout composed component | `app-core/components/layout/` |
| Sidebar component | `app-core/components/layout/sidebar/` |
| App-specific hook | `app-core/hooks/` |
| Route definition | `app-core/src/routes/route-tree.tsx` |
| Zustand store (feature) | `app-core/features/{feature}/{feature}-store.ts` |
| Platform-specific page | `apps/{app}/src/pages/` |

## File Organization

- **One component per file.** Every React component gets its own `.tsx` file, kebab-case.
- **Compound family exception.** A component family that is always imported together (e.g. `AppHeader` + all its parts) stays in one file.
- **Helpers and shared types extracted.** Pure helpers go in `lib/`, shared types in `types.ts` — not inline.
- **Module layout.** Pages and features use: `{module}/{module}-page.tsx`, `{section}-section.tsx`, `components/`, `hooks/`, `lib/`, `types.ts`.
- **Nested component subfolders.** When a component owns 1+ children, group them in a subfolder named after the parent; children drop the parent prefix and can nest recursively.

Imports use scoped path aliases (`@ui/*`, `@comcom/*`) and never go through barrels — see `AGENTS.md` for the canonical rule.

## Decision Trees

| Question | Answer |
|----------|--------|
| How to fetch this data? | Table in `syncTablesConfig` → `useLiveQuery` via `useCollections()`. Otherwise → `useQuery` with query key factory. See [data-fetching.md](references/data-fetching.md). |
| How to write this data? | Synced table → `collection.update(id, draft => {...})`. New record needing server response → `useMutation`. |
| How to manage this state? | Persisted URL filter/tab on a page you own → TanStack Router `validateSearch` + page-local `useThingSearch()` hook (see [data-table-filter.md](references/data-table-filter.md)); reach for `nuqs` only for primitive scalars on routes you don't own. Global UI toggle (dialog open) → Zustand store. Scoped to subtree → React context. Component-local → `useState`. |
| What dialog component? | Multi-field content/form → `HybridDialog`. Simple destructive yes/no → `HybridAlertDialog`. See [dialogs.md](references/dialogs.md). |
| Where does this component go? | Check the Component Hierarchy table above. When in doubt → page-specific → `app-core/pages/{page}/`. |
| What's the canonical shape of X? | See [common-patterns.md](references/common-patterns.md) — component, hook, mutation, form, dialog, icons, toasts, nav, url-state, zustand, shortcuts, tooltips. |

## React-Specific Naming

- **Event handlers.** `handle*` for component-internal (`handleSubmit`, `handleClose`); `on*` for callback props (`onSubmit`, `onChange`).
- **Component size.** Aim under 150 lines. Over 300 means extract sub-components or hooks.
- **Hook return types.** Annotate when returning an object/tuple with 3+ members; inference is fine for 1–2.

For booleans, constants, JSDoc, function structure, and other universal TypeScript rules, see `practice-code-quality`.

## References

| Reference | Use when |
|-----------|----------|
| [common-patterns.md](references/common-patterns.md) | You need the canonical shape of something fast — component, sync read/write, mutation, form, dialog, state branching, icons, toasts, navigation, URL state, zustand, shortcuts, tooltips |
| [page-anatomy.md](references/page-anatomy.md) | Adding a new page or view |
| [app-wiring.md](references/app-wiring.md) | Understanding how the app is assembled (providers, layout, router, sidebar, route tree) |
| [component-anatomy.md](references/component-anatomy.md) | Creating or modifying a component (props, data-slot, cva, cn(), render prop, named exports, compound families) |
| [component-catalog.md](references/component-catalog.md) | Checking whether a component already exists |
| [design-system.md](references/design-system.md) | Building new design system components (ui/ vs particles/, Base UI integration) |
| [dialogs.md](references/dialogs.md) | Adding a dialog or modal |
| [forms.md](references/forms.md) | Adding or editing a form (react-hook-form + zod) |
| [tables.md](references/tables.md) | Displaying data in a table (manual Table or DataTable) |
| [data-table-filter.md](references/data-table-filter.md) | Adding a faceted filter bar with bazza @bazza/ui filter and TanStack Router URL state |
| [animation.md](references/animation.md) | Adding animations — single source of motion rules (philosophy, durations, easings, springs, AnimatePresence, tw-animate-css) |
| [ui-constraints.md](references/ui-constraints.md) | Reviewing or finalizing any UI — pre-ship checklist plus MUST/SHOULD/NEVER rules and anti-patterns |
| [data-fetching.md](references/data-fetching.md) | Reading or writing server data (sync vs React Query, mutations, error handling) |
| [error-handling.md](references/error-handling.md) | Surfacing server/auth errors in UI |
| [sync.md](references/sync.md) | Adding a new synced table or touching sync infra (Electric SQL) |
| [auth-client.md](references/auth-client.md) | Auth UI or session management (`useSession`, org context, per-platform guards) |
| [nextjs.md](references/nextjs.md) | Working on apps/web or apps/admin |
| [mobile.md](references/mobile.md) | Working on apps/mobile (Expo Router, Uniwind, RN primitives) |
| [desktop.md](references/desktop.md) | Working on apps/desktop (Tauri 2.x, deep-link OAuth) |
| [chat-tool-blocks.md](references/chat-tool-blocks.md) | Adding or modifying chat tool-block UI components (file layout, registry, memoization) |
| [frontend-testing.md](references/frontend-testing.md) | Writing frontend tests (vitest + jsdom, mocking) |
