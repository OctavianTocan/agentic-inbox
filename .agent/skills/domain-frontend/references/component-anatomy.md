# Component Anatomy

How to structure a component file — props, naming, exports, and the patterns every component follows.

## File Naming

kebab-case for all component files: `button.tsx`, `settings-card.tsx`, `app-header.tsx`.

## Function Shape

Function declarations (not arrows), destructured props with `className` + spread, `data-slot` on root:

```tsx
function Card({ className, size = "default", ...props }:
  React.ComponentProps<"div"> & { size?: "default" | "sm" }
) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(/* base classes */, className)}
      {...props}
    />
  );
}
```

## Props

Type props by component shape:

```tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">) { ... }

function Button({ className, variant, size, ...props }:
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
) { ... }

function Badge({ className, variant, render, ...props }:
  useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>
) { ... }

export type UserMenuProps = { showName?: boolean; className?: string };
export function UserMenu({ showName, className }: UserMenuProps) { ... }
```

Always use `type` aliases, never `interface`. Never use `forwardRef`.

## Variants with cva

Module-level constant. Export alongside the component:

```tsx
const buttonVariants = cva(/* base classes */, {
  variants: {
    variant: {
      default: /* ... */,
      outline: /* ... */,
      secondary: /* ... */,
      ghost: /* ... */,
      destructive: /* ... */,
    },
    size: {
      default: /* ... */,
      xs: /* ... */, sm: /* ... */, lg: /* ... */,
      icon: /* ... */, "icon-xs": /* ... */, "icon-sm": /* ... */, "icon-lg": /* ... */,
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export { Button, buttonVariants };
```

## cn() Merging

Two patterns — use the one that matches your component:

```tsx
// Simple components: className as separate argument
className={cn(/* static classes */, className)}

// Components with cva: className INSIDE the cva call
className={cn(buttonVariants({ variant, size, className }))}
className={cn(badgeVariants({ className, variant }))}
```

The second pattern is preferred for components with variants — it lets cva handle the merge.

## useRender (Polymorphic Components)

For components that accept a `render` prop, use Base UI's `useRender` + `mergeProps`:

```tsx
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

function Badge({ className, variant = "default", render, ...props }:
  useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>
) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ className, variant })) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  });
}
```

## data-slot

Every design-system component gets `data-slot` on its root element (kebab-case). These enable parent-child CSS coordination via Tailwind modifiers:

```tsx
// Identification
<div data-slot="card" />
<div data-slot="card-header" />

// Parent queries child slots
'has-data-[slot=card-footer]:pb-0'

// Child queries parent slots
'in-data-[slot=button-group]:rounded-none'

// Size propagation via group modifier
'group-data-[size=sm]/card:px-3'
```

## Base UI Render Prop

Delegates element rendering without a wrapper. Used for triggers and close buttons:

```tsx
// Trigger renders AS a Button (not wrapped in one)
<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
  <MoreHorizontalIcon className="size-4" />
</DropdownMenuTrigger>

// Close renders AS a Button
<DialogClose render={<Button variant="ghost" size="icon-sm" />}>
  <XIcon className="size-4" />
</DialogClose>
```

## Compound Components

Multiple related components in one file. Each wraps a base primitive with domain defaults:

```tsx
function SettingsCard({ className, ...props }: React.ComponentProps<'div'>) {
  return <Card className={cn(/* tweaked defaults */, className)} {...props} />;
}

function SettingsCardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardFooter className={cn(/* tweaked defaults */, className)} {...props} />;
}

export { SettingsCard, SettingsCardHeader, SettingsCardTitle, /* ... */ };
```

Specialization components use `React.ComponentProps<'div'>` (not `typeof Card`) and do NOT add their own `data-slot` — they inherit slots from the underlying components.

## Stateful Compound Families

Some compound families coordinate behavior, not just layout. The pattern: one Provider owns shared state, parts read it via a `useX()` hook, and the Provider mounts at the page-level join point. Children take ~no data props.

```tsx
// Provider owns state
export function ComposerProvider({ children, onSubmit }: ComposerProviderProps) {
  const [text, setText] = useState('');
  // ...derived status, callbacks...
  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function useComposer() {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error('useComposer must be used within a ComposerProvider');
  return ctx;
}

function ComposerSendButton({ className, ...props }: React.ComponentProps<'button'>) {
  const { submit, status } = useComposer();
  return (
    <button
      data-slot="composer-send"
      data-state={status.type === 'ready' ? 'ready' : 'disabled'}
      onClick={() => submit()}
      className={cn(/* base classes */, className)}
      {...props}
    />
  );
}
```

Rules:

- **Parts take styling props (`className`, `children`), not data.** Everything else comes from the hook.
- **Provider lives at the smallest subtree containing every consumer.** Inversion of control happens here: the page passes `onSubmit`, adapters, etc. as Provider props.
- **The hook assertion is the contract.** Any `<Composer*>` part requires a `ComposerProvider` ancestor; the hook throws otherwise.
- **Sibling sections share state for free.** A toolbar, footer, and textarea on different parts of the page all see the same draft via the same Provider.

This is distinct from the design-system "Block" definition (`design-system.md`), which forbids stores and data fetching. The design-system layer stays stateless; stateful compound families live in `@/ai-ui` and feature folders.

## Twin Entry Points (Hook + Zero-DOM Component)

When the same logic is useful both as a hook (composable inside a host's effects) and as a drop-in component (declarative inside JSX), expose both. They share one context/store.

```tsx
// Hook: composable inside a host's logic
export function useComposerSync(id: string): void {
  const { text, attachments, setText, setAttachments } = useComposer();
  // ...hydrate on mount, persist on change to localStorage...
}

// Zero-DOM component: declarative inside JSX
export function ComposerSync({ id }: { id: string }): null {
  useComposerSync(id);
  return null;
}
```

Use the hook from custom integrations; use the component when the host is JSX-shaped and prefers declarative children. Both must sit inside the same Provider as the rest of the family.

## When to Create vs Extend

- **Create new**: behavior differs (new interactions, new state, new ARIA patterns)
- **Extend via specialization**: only styling/defaults differ (SettingsCard = Card + tweaked classes)
- **Compose inline**: one-off combination that only appears once (no need for a reusable component)

## Internal Sub-Components

Components used only within the same file — plain function declarations, not exported:

```tsx
export function MembersContent() { ... }
function MembersHeaderActions() { ... }
function MembersTabs() { ... }
```

## Exports

Named exports only. No `export default` (except Next.js pages/layouts). No top-of-package barrels; folder-scoped `index.ts` re-export barrels are permitted for multi-file compound components (e.g. `code-view/index.ts`, `markdown/index.ts`, `form-submit-bar/index.ts`) and stay lowercase to match the kebab-case file convention.

## 'use client'

Add when the file uses hooks, state, event handlers, or browser APIs. Omit for pure render components with no interactivity.

## Key Files

- `apps/web/src/design-system/components/ui/button.tsx` — cva + Base UI primitive
- `apps/web/src/design-system/components/ui/card.tsx` — compound component with data-slot coordination
- `apps/web/src/design-system/components/ui/settings-card.tsx` — specialization pattern
- `apps/web/src/design-system/components/ui/badge.tsx` — variant component pattern
- `apps/web/src/ai-ui/composer/composer-provider.tsx` — stateful compound family (Provider + `useComposer()`)
- `apps/web/src/ai-ui/providers/message-provider.tsx`, `thread-provider.tsx`, `part-provider.tsx` — same pattern for messages, threads, parts
- `apps/web/src/components/chat/chat-panel.tsx` — app-level chat wiring
- `apps/web/src/components/inbox/inbox-shell.tsx` — product shell integration and keyboard shortcuts
