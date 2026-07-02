# App Wiring

How the app is assembled — provider stack, layout hierarchy, router abstraction, sidebar, and route tree.

## Boot Sequence

```
main.tsx → App → DesignSystemProvider → RouterProvider (TanStack Router)
```

## Provider Layers

### Design System Layer

Nesting order: `Theme > Hotkeys > Tooltip`, with `Toaster` outside children.

### App Layer

Nesting order: `Analytics > RouterAdapter > QueryProvider` (with `Suspense` around `QueryProvider`).

`QueryProvider` persists the React Query cache to IndexedDB and auto-clears on user change.

## Layout Hierarchy

Each layout is a route component with `<Outlet />` for nested children:

```
WebRootLayout          NuqsAdapter + Providers + fonts
  └── WebAuthedLayout  AuthedSessionProvider + WaitlistRedirect
      └── WebAppLayout AppCollectionsProvider + SessionsProvider + Sidebar + SessionPanel + global dialogs
          └── WebOrgLayout  ActiveOrgSyncer
              └── [page content]
```

- **WebRootLayout** — NuqsAdapter for primitive fallback URL state, analytics, query client; route-owned URL state still defaults to TanStack Router `validateSearch`
- **WebAuthedLayout** — auth gate: redirects unauthenticated, provides session
- **WebAppLayout** — app chrome: sidebar, session panel, search/feedback/shortcuts dialogs. Conditionally renders sidebar only for org routes (paths starting with `/~/`).
- **WebOrgLayout** — syncs active org

## Router Abstraction

Shared packages use a framework-agnostic router via `@comcom/app-shared/providers/router`:

```tsx
// Available in shared packages — no router library dependency
import { RouterLink, useNavigate, usePathname, useParams } from '@comcom/app-shared/providers/router';
```

Each app provides an adapter:
- `apps/app/src/lib/router-adapter.tsx` — TanStack Router
- `packages/comcom/app-shared/src/providers/next-router.tsx` — Next.js

Always use `RouterLink` and `useNavigate` in shared/app-core packages, never import directly from a router library.

## Sidebar

```
AppSidebar
  ├── SidebarHeader     OrganizationMenu + SearchIconButton
  ├── SidebarNavGroups  Navigation items with Mod+number shortcuts
  └── SidebarFooter     UserMenu + SettingsIconButton
```

To add a nav item, edit the nav group definitions in `packages/comcom/app-core/src/components/layout/sidebar/constants.ts`.

## Route Tree

Routes are defined centrally in `app-core/src/routes/route-tree.tsx`. The layout routes are created by the app shell and passed in; the factory destructures them and attaches pages:

```tsx
export function createAppRouteTree(layouts, overrides) {
  const { rootRoute, authedRoute, appRoute, orgRoute } = layouts;

  // add org-scoped pages here
  const itemsRoute = createRoute({
    getParentRoute: () => orgRoute,
    path: '/items',
    component: ItemsContent,
  });
}
```

Platform-specific pages (sign-in, onboarding) are passed as overrides from the app shell.

## Adding a New Wired Feature

1. **Create page component** in `app-core/src/pages/{feature}/`
2. **Register route** in `app-core/src/routes/route-tree.tsx`
3. **Add sidebar nav item** (if needed) in `sidebar/constants.ts`
4. **Add provider** (if needed) at the appropriate layout level — add to `WebAppLayout` for org-scoped state, `WebAuthedLayout` for auth-scoped state

## Key Files

- `apps/app/src/router.tsx` — layout components
- `apps/app/src/components/providers.tsx` — app-level providers
- `packages/comcom/app-shared/src/providers/router.tsx` — router abstraction
- `packages/comcom/app-core/src/routes/route-tree.tsx` — route definitions
- `packages/ui/design-system/src/providers/index.tsx` — DesignSystemProvider
- `packages/comcom/app-core/src/components/layout/sidebar/constants.ts` — sidebar nav config
