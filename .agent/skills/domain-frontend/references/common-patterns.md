# Common Patterns

Copy-paste shapes for the most frequent frontend tasks. Match these exactly; do not improvise.

## Contents

- Component skeleton (with variants)
- API read via app-local client
- API write via app-local client
- Form with zod + react-hook-form
- HybridDialog with form
- Content state branching
- Icons
- Toasts
- Navigation
- URL state (Next route/search params)
- Zustand feature store
- Keyboard shortcuts
- Tooltip decision

## Component Skeleton (with variants)

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design-system/lib/utils';

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

## API Read

```tsx
export function useInboxSnapshot() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  useEffect(() => {
    let cancelled = false;
    getInbox().then((snapshot) => {
      if (!cancelled) setInbox(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return inbox;
}
```

## API Write

```tsx
export function useInboxUndo(client: InboxClient) {
  return useCallback(
    async (ledgerEntryId: string, emailId: string) => {
      const nextInbox = await client.undoAction(ledgerEntryId, emailId);
      return nextInbox;
    },
    [client]
  );
}
```

## Form with zod

```tsx
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
  useForm, zodResolver,
} from '@/design-system/components/ui/form';

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

Import from the app-local design system icon registry (never from `@hugeicons/*` or `lucide-react` directly in app code). Use `size-*` classes. Icons inside a button with `aria-label` do not need `aria-hidden`.

```tsx
import { PlusIcon, XIcon } from '@/design-system/components/icons';

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

toast.success('Saved');
```

## Navigation

Use Next.js App Router primitives in route files and local product components. Keep navigation thin; the current inbox app is mostly route-light and panel-state driven.

```tsx
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

<Link href="/audit">Audit</Link>

const router = useRouter();
router.push('/audit');

const pathname = usePathname();
const searchParams = useSearchParams();
```

## URL State

Default to component state for review-workflow UI that does not need shareable links. Use Next route params/search params only for state a reviewer should be able to bookmark or send.

```ts
// components/<area>/lib/filter-schema.ts
export const thingSearchSchema = z.object({
  q: z.string().catch('').default(''),
  page: z.number().int().min(1).catch(1).default(1),
});
```

Avoid nested object arrays in query strings unless the route has a tested parser/serializer. Primitive search, tab, and selected-id params are safe.

```tsx
// nuqs: primitive-scalar fallback only
import { parseAsStringLiteral, useQueryState } from 'nuqs';

const [tab, setTab] = useQueryState(
  'tab',
  parseAsStringLiteral(['all', 'active', 'archived'] as const).withDefault('all'),
);
```

## Zustand Feature Store

Module-level store for feature UI state only when state must outlive one page shell. Prefer local state in `InboxShell`/`AuditPage` until sharing pressure appears.

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
import { useShortcut } from '@/design-system/hooks/use-shortcut';

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
| `PointerTooltipContent` | Pointer-following drag affordances such as resizable panel handles. |
| `Tooltip` | Low-level, only when you need custom layout. Prefer one of the above. |

```tsx
import { ShortcutTooltip } from '@/design-system/components/ui/shortcut-tooltip';

<ShortcutTooltip label="Search" shortcut={SEARCH_SHORTCUT}>
  <Button variant="ghost" size="icon" aria-label="Search">
    <SearchIcon className="size-4" />
  </Button>
</ShortcutTooltip>
```
