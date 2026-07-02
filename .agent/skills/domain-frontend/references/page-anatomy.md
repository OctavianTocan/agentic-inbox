# Page Anatomy

How to add a new page — route registration, layout shell, and content state branching.

## Where Content Components Live

Page content lives in `app-core/src/pages/{feature}/`, NOT in `apps/app/src/`. The app shell is thin — pages delegate to page components from `@comcom/app-core`.

## Route Registration

Add routes in `app-core/src/routes/route-tree.tsx`:

```tsx
// List page
const itemsRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: '/items',
  component: ItemsContent,
});

// Detail page with route params
const itemDetailRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: '/items/$itemId',
  component: ItemDetailContent,
});

function ItemDetailContent() {
  const { itemId } = useParams({ strict: false });
  // ...
}
```

Routes nest: `rootRoute` → `authedRoute` → `appRoute` → `orgRoute` → your route. Org routes use the `/~/$orgSlug` prefix.

## Page Shell Structure

Every content page follows this canonical structure:

```tsx
export function ItemsContent() {
  return (
    <>
      <AppTopBar breadcrumbs={[{ label: 'Items' }]} />
      <AppShell maxWidth="default">
        <AppHeader variant="title">
          <AppHeaderContent>
            <AppHeaderGroup>
              <AppHeaderTitle>Items</AppHeaderTitle>
              <AppHeaderDescription>Manage your items.</AppHeaderDescription>
            </AppHeaderGroup>
          </AppHeaderContent>
          <AppHeaderActions>
            <Button>Create Item</Button>
          </AppHeaderActions>
        </AppHeader>
        <AppShellContent>
          <ItemsList />
        </AppShellContent>
      </AppShell>
    </>
  );
}
```

`AppTopBar` (`app-core/src/components/layout/top-bar`) is the composed convenience wrapper over the design-system TopBar primitives — it bakes in the sidebar trigger, breadcrumbs, and session panel trigger so you pass only `breadcrumbs`.

Do NOT skip `AppHeaderContent` or `AppHeaderGroup` — they provide the flex layout.

## maxWidth

Set `maxWidth` once on `AppShell`. `AppHeader`, `AppHeaderToolbar`, and `AppShellContent` inherit it via context. Per-primitive overrides still work for the rare case where a section needs a different width.

| Variant | Use for |
|---------|---------|
| `"default"` | List/grid pages |
| `"narrow"` | Settings/form pages |
| `"2xl"`     | Detail pages with a narrow column (settings-style detail surfaces) |
| `"full"` | Full-width dashboards |

## AppHeader variants

| Variant | Use for |
|---------|---------|
| `"compact"` (default) | Single-row breadcrumb-style header |
| `"title"`   | Multi-line title block: `AppHeaderTitle` + `AppHeaderDescription` + `AppHeaderActions` |

The `title` variant bakes in `h-auto min-h-16 py-3` and the gutter padding — never paste those classes via `className`.

## Content State Branching

Use early returns. Extract each state into a named component:

```tsx
function ItemsList() {
  const { items, isLoading } = useItems();

  if (isLoading) return <ItemsListSkeleton />;
  if (items.length === 0) return <ItemsListEmpty />;
  return <ItemsTable items={items} />;
}
```

With search/filters, add a no-results state:

```tsx
if (filtered.length === 0 && searchQuery) return <ItemsNoResults />;
```

## Skeleton Loading

Mirror the final layout with `Skeleton` primitives. Use gradient mask for fade-out:

```tsx
<div style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
  <Table>
    {/* same structure as the real table, but Skeleton in each cell */}
  </Table>
</div>
```

## Empty States

Use the `Empty` compound component with a clear next action:

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderIcon /></EmptyMedia>
    <EmptyTitle>No items yet</EmptyTitle>
    <EmptyDescription>Create your first item to get started.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Create Item</Button>
  </EmptyContent>
</Empty>
```

## Toolbar

`AppHeaderToolbar` sits between the header and content for search, filters, or tabs:

```tsx
<AppShell maxWidth="default">
  <Tabs defaultValue="all">
    <AppHeader>
      <AppHeaderContent>...</AppHeaderContent>
    </AppHeader>
    <AppHeaderToolbar>
      <TabsList variant="line">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
      </TabsList>
    </AppHeaderToolbar>
    <AppShellContent>
      <TabsContent value="all">...</TabsContent>
      <TabsContent value="active">...</TabsContent>
    </AppShellContent>
  </Tabs>
</AppShell>
```

## Key Files

- `packages/comcom/app-core/src/pages/access-tokens/access-tokens-page.tsx` — canonical page
- `packages/comcom/app-core/src/pages/members/` — tabs + toolbar
- `packages/comcom/app-core/src/components/layout/top-bar.tsx` — AppTopBar wrapper
- `packages/ui/design-system/src/components/ui/app-shell.tsx` — AppShell + AppShellContent
- `packages/ui/design-system/src/components/ui/app-header.tsx` — AppHeader compound components
- `packages/comcom/app-core/src/routes/route-tree.tsx` — route registration
