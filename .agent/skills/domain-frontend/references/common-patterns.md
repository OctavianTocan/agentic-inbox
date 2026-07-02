# Common Patterns

Copy-paste shapes for the most frequent frontend tasks. Match these exactly; do not improvise.

## Contents

- Component skeleton (with variants)
- Sync read via `useLiveQuery`
- Sync write via `collection.update`
- React Query mutation
- Form with zod + react-hook-form
- HybridDialog with form
- Content state branching
- Icons
- Toasts
- Navigation
- URL state (TanStack Router `validateSearch`, `nuqs` fallback)
- Zustand feature store
- Keyboard shortcuts
- Tooltip decision

## Component Skeleton (with variants)

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@ui/design-system/lib/utils';

const myComponentVariants = cva('base-classes', {
  variants: { size: { default: '...', sm: '...' } },
  defaultVariants: { size: 'default' },
});

export function MyComponent({
  className,
  size,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof myComponentVariants>) {
  return (
    <div
      data-slot="my-component"
      className={cn(myComponentVariants({ size, className }))}
      {...props}
    />
  );
}
```

For polymorphic (render prop), compound families, and useRender patterns, see [component-anatomy.md](component-anatomy.md).

## Sync Read (useLiveQuery)

```tsx
export function useSessions() {
  const { sessions } = useCollections();
  const { data, isLoading } = useLiveQuery(
    (query) => query.from({ sessions }),
    [sessions],
  );
  return { sessions: data ?? [], isLoading };
}
```

## Sync Write (optimistic)

```tsx
export function useSessionTerminate() {
  const { sessions } = useCollections();
  return useCallback(
    (sessionId: string) =>
      sessions.update(sessionId, (draft) => {
        draft.status = 'terminated';
      }),
    [sessions],
  );
}
```

## React Query Mutation

```tsx
import { toastApiError } from '@comcom/app-shared/lib/api-errors';

export function useApiKeyCreate() {
  return useMutation({
    mutationFn: async (body: CreateApiKeyPayload) => {
      const { data } = await apiKeysCreate({ body, throwOnError: true });
      return data;
    },
    onError: toastApiError,
  });
}
```

## Form with zod

```tsx
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
  useForm, zodResolver,
} from '@ui/design-system/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Required').max(120),
});

function MyForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form id="my-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## HybridDialog with Form

```tsx
<HybridDialog open={open} onOpenChange={handleOpenChange}>
  <HybridDialogContent>
    <HybridDialogHeader>
      <HybridDialogTitle>Create item</HybridDialogTitle>
      <HybridDialogDescription>Fill in the details.</HybridDialogDescription>
    </HybridDialogHeader>
    <HybridDialogBody>{/* <form id="my-form"> */}</HybridDialogBody>
    <HybridDialogFooter>
      <HybridDialogClose render={<Button variant="outline" />}>Cancel</HybridDialogClose>
      <Button disabled={isPending} form="my-form" type="submit">
        {isPending && <Spinner />}
        Create
      </Button>
    </HybridDialogFooter>
  </HybridDialogContent>
</HybridDialog>
```

## Content State Branching

```tsx
function MyContent() {
  const { data, isLoading, error } = useMyData();

  if (isLoading) return <MySkeleton />;
  if (error) return <MyErrorState />;
  if (data.length === 0) return <MyEmptyState />;
  return <MyList data={data} />;
}
```

## Icons

Import from the design system re-exports (never from `lucide-react` or `@central-icons-react` directly). Use `size-*` classes. Icons inside a button with `aria-label` do not need `aria-hidden`.

```tsx
import { PlusIcon, XIcon } from '@ui/design-system/components/icons';

<Button aria-label="Close" variant="ghost" size="icon-sm">
  <XIcon className="size-4" />
</Button>

<div className="flex items-center gap-2">
  <PlusIcon className="size-4" aria-hidden />
  <span>New item</span>
</div>
```

## Toasts

```tsx
import { toast } from 'sonner';
import { toastApiError } from '@comcom/app-shared/lib/api-errors';

toast.success('Saved');

try {
  await apiCall();
} catch (error) {
  toastApiError(error);
}

useMutation({
  mutationFn: updateSomething,
  onSuccess: () => toast.success('Updated'),
  onError: toastApiError,
});
```

## Navigation

Use the router abstraction from `@comcom/app-shared/providers/router`, not the raw TanStack/Next.js hooks. This keeps shared packages framework-agnostic.

```tsx
import { RouterLink, useNavigate, usePathname, useParams } from '@comcom/app-shared/providers/router';

<RouterLink to="/items">Items</RouterLink>

const navigate = useNavigate();
navigate('/items/new');

const pathname = usePathname();
const { itemId } = useParams();
```

## URL State

Default to TanStack Router's `validateSearch` plus a page-local `useThingSearch()` hook for any URL-persisted filter/tab/pagination state on a route you own. The router serializes/deserializes the search object directly, so nested shapes (a filter array of objects) round-trip cleanly. See [data-table-filter.md](data-table-filter.md) for the canonical wiring; the Sessions settings page is the live precedent.

```ts
// pages/<area>/lib/filter-schema.ts
export const thingSearchSchema = z.object({
  q: z.string().catch('').default(''),
  page: z.number().int().min(1).catch(1).default(1),
  filters: filterStateSchema.catch([]).default([]),
});

// routes/route-tree.tsx
const thingRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: '/things',
  component: ThingPage,
  validateSearch: thingSearchSchema,
});
```

Reach for `nuqs` only for primitive scalars (`q`, `page`, repeated string params) on routes you don't own (third-party route tree, static-generation pages without TanStack Router). Never use `nuqs` for an array of objects or any nested structure; the `URLSearchParams` round-trip coerces objects to `"[object Object]"` and silently collapses chips to default.

```tsx
// nuqs: primitive-scalar fallback only
import { parseAsStringLiteral, useQueryState } from 'nuqs';

const [tab, setTab] = useQueryState(
  'tab',
  parseAsStringLiteral(['all', 'active', 'archived'] as const).withDefault('all'),
);
```

## Zustand Feature Store

Module-level store for feature UI state. Live in `features/{feature}/{feature}-store.ts`.

```tsx
'use client';

import { create } from 'zustand';

type SearchStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useSearchStore = create<SearchStore>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
```

Consume: `const isOpen = useSearchStore((s) => s.isOpen);`

## Keyboard Shortcuts

```tsx
import { useShortcut } from '@ui/design-system/hooks/use-shortcut';

const SEARCH_SHORTCUT = { keys: 'mod+k', label: 'Search' };

function SearchDialog() {
  const toggle = useSearchStore((s) => s.toggle);
  useShortcut(SEARCH_SHORTCUT, () => toggle());
  // ...
}
```

Key format: `mod+k` (mod = ⌘ on Mac, Ctrl on Windows/Linux). Other modifiers: `shift`, `alt`, `ctrl`, `meta`.

## Tooltip Decision

| Component | Use when |
|-----------|----------|
| `HybridTooltip` | Default. Responsive — shows on desktop, hides on mobile. |
| `ShortcutTooltip` | When the action has a keyboard shortcut — renders label + kbd together. |
| `Tooltip` | Low-level, only when you need custom layout. Prefer one of the above. |

```tsx
import { ShortcutTooltip } from '@ui/design-system/components/ui/shortcut-tooltip';

<ShortcutTooltip label="Search" shortcut={SEARCH_SHORTCUT}>
  <Button variant="ghost" size="icon" aria-label="Search">
    <SearchIcon className="size-4" />
  </Button>
</ShortcutTooltip>
```
