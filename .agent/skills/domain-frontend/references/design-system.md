# Design System

Architecture of `apps/web/src/design-system` — how primitives are built, composed, and extended in this repo.

## Package Architecture

```
apps/web/src/design-system/
  components/
    ui/           # Single-purpose primitives (Button, Card, Dialog, Tabs, etc.)
    icons/        # Hugeicons wrappers + local brand icons
   hooks/          # useIsMobile, useDebounce, useModifierHeld
   providers/      # DesignSystemProvider
   lib/            # cn(), shortcuts, local utilities
  styles/         # globals.css
```

## Component Hierarchy

```
Primitives → Particles → Blocks → Features
```

### Primitives (`ui/`)

Single-element wrappers. One HTML element or Base UI primitive + cva + data-slot. No composition logic. Examples: Button, Input, Card, Badge, Dialog.

### Particles (`ui/` or `hooks/`)

Behavior-enhanced controls. Combine 1-3 primitives with one hook or interaction. Still "one control" — not a layout structure. This repo keeps those controls in `components/ui/` when they render UI (`copy-button.tsx`, `shortcut-tooltip.tsx`) and in `hooks/` when they are behavior-only.

**When to create a particle**: a primitive + behavior combination appears in 2+ places. If it's pure layout composition (no hook/logic), it's a block instead.

### Blocks (`ui/` — mixed with primitives)

Multi-part compound families with layout contracts. 4-10 parts coordinated via `data-slot` and Tailwind group modifiers. No data fetching, no API calls, no stores. Examples: SettingsCard (8 parts), Empty (6 parts), InputGroup (6 parts), Field (10 parts), Item (10 parts), Section (8 parts), DataTable (10+ files).

**When to create a block**: a structured layout pattern with parent-child coordination appears in 2+ places. Blocks own layout contracts; particles own behavior.

### Features (`apps/web/src/components/{feature}/` and `apps/web/src/lib/{feature}/`)

Full interactive units. Own app-specific state, call APIs, register keyboard shortcuts, handle complex event flows. Examples: inbox, audit, chat panel.

For component file conventions (props, cva, data-slot, cn(), exports), see [component-anatomy.md](component-anatomy.md).

## Base UI Integration

Components like Button, Dialog, Tabs, Select, and DropdownMenu wrap `@base-ui/react` primitives. Base UI provides behavior (focus, keyboard nav, ARIA, open/close state). The design system wrapper adds styling and `data-slot`.

Import pattern — always named imports:

```tsx
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
```

Structural pattern:

```tsx
function DialogContent({ className, children, showCloseButton = true, ...props }:
  DialogPrimitive.Popup.Props & { showCloseButton?: boolean }
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(/* base dialog classes */, className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" />}>
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}
```

## The Render Prop

Base UI's `render` prop delegates element rendering without a wrapper — see [component-anatomy.md](component-anatomy.md#base-ui-render-prop) for usage examples.

## Compound Component Construction

All parts in one file by default; multi-file compounds (e.g. `code-view/`, `markdown/`, `form-submit-bar/`) live in a `{name}/` folder with `{name}-x.tsx` siblings and a lowercase `index.ts` barrel re-exporting the trio when a single primitive file becomes unwieldy or when sub-parts need their own `'use client'` boundary. Each part gets `data-slot`. Parent-child coordination uses Tailwind group modifiers:

```tsx
// Selector syntax for parent-child coordination:
'has-data-[slot=card-footer]:...'      // parent has child with slot
'in-data-[slot=button-group]:...'      // child is inside parent with slot
'group-data-[size=sm]/card:...'        // child adapts to parent's data attribute
```

For the full compound component file pattern, see [component-anatomy.md](component-anatomy.md#compound-components).

## Styling Conventions

- **Semantic tokens**: `bg-primary`, `text-muted-foreground`, `border-border`, `bg-sidebar` — never raw colors
- **No page spacing in primitives**: Components own internal spacing but generic primitives never set page margins. Product shells such as the inbox desktop work area may own their 8px backing/panel gutters.
- **cn() always**: Every component accepting `className` must merge with `cn()`
- **Semi-transparent borders**: `border-black/10`, `border-white/10` to adapt to any background
- **Ring borders**: prefer `ring-1 ring-foreground/10` over `border` for subtle container edges

## Key Files

- `apps/web/src/design-system/components/ui/button.tsx` — cva + Base UI primitive
- `apps/web/src/design-system/components/ui/sidebar.tsx` — collapsible/resizable sidebar compound family
- `apps/web/src/design-system/components/ui/resizable.tsx` — panel separator with pointer-follow tooltip
- `apps/web/src/design-system/components/ui/tooltip.tsx` — Base UI tooltip plus pointer tooltip layer
- `apps/web/src/design-system/providers/index.tsx` — DesignSystemProvider
