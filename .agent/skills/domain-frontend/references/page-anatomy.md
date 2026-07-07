# Page Anatomy

How to add or modify a route-backed view in `apps/web`.

## Where Content Components Live

Next.js route files live in `apps/web/src/app`, but product content lives in `apps/web/src/components/{feature}`. Route files should be thin server/client boundaries, not large UI modules.

## Route Registration

Create folders under `apps/web/src/app` using App Router conventions:

```tsx
// apps/web/src/app/review/page.tsx
import { ReviewPage } from '@/components/review/review-page';

export default function ReviewRoute() {
  return <ReviewPage />;
}
```

Use server components for route files by default. Add `'use client'` only to the smallest component that needs hooks, state, event handlers, or browser APIs.

## Reading Server Context

When a route needs cookies or headers, read them in the route file and pass plain values to the product shell:

```tsx
import { cookies } from 'next/headers';

export default async function InboxPage() {
  const cookieStore = await cookies();
  const persistedWidth = parseWidthCookie(cookieStore.get(SIDEBAR_WIDTH_COOKIE_NAME)?.value, 264, 220, 360);
  return <InboxShell persistedWidth={persistedWidth} />;
}
```

## Product Page Structure

Product shells compose existing design-system primitives and feature components:

```tsx
export function ReviewPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <ReviewSidebar />
      <ReviewContent />
      <ReviewChat />
    </main>
  );
}
```

Keep state at the shell when multiple panels coordinate. Extract a child component when a section has its own loading/error/empty branching or event flow.

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

Mirror the final layout with `Skeleton` primitives. Use gradient mask for long table/list fades:

```tsx
<div style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
  <Table>{/* same structure as the real table, but Skeleton in each cell */}</Table>
</div>
```

## Empty States

Use the `Empty` compound component with one clear next action:

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

## Key Files

- `apps/web/src/app/page.tsx` — thin inbox route
- `apps/web/src/app/audit/page.tsx` — thin audit route
- `apps/web/src/components/inbox/inbox-shell.tsx` — route-backed product shell
- `apps/web/src/components/audit/audit-page.tsx` — route-backed product shell
- `apps/web/src/design-system/components/ui/app-shell.tsx` — generic app shell primitive
- `apps/web/src/design-system/components/ui/app-header.tsx` — generic header primitives
