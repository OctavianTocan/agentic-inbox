# Design System

Architecture of `@ui/design-system` — how primitives are built, composed, and extended.

## Package Architecture

```
packages/ui/design-system/src/
  components/
    ui/           # Single-purpose primitives (Button, Card, Dialog, Tabs, etc.)
    particles/    # Composed blocks (CopyButton, ThemeToggle)
    icons/        # Central Icon System exports + lucide fallback + brand icons
  hooks/          # useIsMobile, useDebounce, useModifierHeld
  providers/      # DesignSystemProvider
  lib/            # cn(), formatDate, handleError, shortcuts
  styles/         # globals.css
```

## Component Hierarchy

```
Primitives → Particles → Blocks → Features
```

### Primitives (`ui/`)

Single-element wrappers. One HTML element or Base UI primitive + cva + data-slot. No composition logic. Examples: Button, Input, Card, Badge, Dialog.

### Particles (`particles/`)

Behavior-enhanced controls. Combine 1-3 primitives with one hook or interaction. Still "one control" — not a layout structure. Examples: CopyButton (Button + clipboard hook), ThemeToggle (Button + DropdownMenu + useTheme).

**When to create a particle**: a primitive + behavior combination appears in 2+ places. If it's pure layout composition (no hook/logic), it's a block instead.

### Blocks (`ui/` — mixed with primitives)

Multi-part compound families with layout contracts. 4-10 parts coordinated via `data-slot` and Tailwind group modifiers. No data fetching, no API calls, no stores. Examples: SettingsCard (8 parts), Empty (6 parts), InputGroup (6 parts), Field (10 parts), Item (10 parts), Section (8 parts), DataTable (10+ files).

**When to create a block**: a structured layout pattern with parent-child coordination appears in 2+ places. Blocks own layout contracts; particles own behavior.

### Features (`app-core/src/features/{feature}/`)

Full interactive units. Own a Zustand store, call APIs, register keyboard shortcuts, handle complex event flows. Examples: SearchDialog, FeedbackDialog, InspectorPanel, SessionPanel.

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

- **Semantic tokens**: `bg-primary`, `text-muted-foreground`, `border-border` — never raw colors
- **No page spacing**: Components own internal spacing but never set external margins or page padding
- **cn() always**: Every component accepting `className` must merge with `cn()`
- **Semi-transparent borders**: `border-black/10`, `border-white/10` to adapt to any background
- **Ring borders**: prefer `ring-1 ring-foreground/10` over `border` for subtle container edges

## Key Files

- `packages/ui/design-system/src/components/ui/button.tsx` — cva + Base UI primitive
- `packages/ui/design-system/src/components/ui/dialog.tsx` — Base UI wrapper pattern
- `packages/ui/design-system/src/components/ui/card.tsx` — compound component with group modifiers
- `packages/ui/design-system/src/components/ui/empty.tsx` — compound component with cva media variants
- `packages/ui/design-system/src/providers/index.tsx` — DesignSystemProvider
