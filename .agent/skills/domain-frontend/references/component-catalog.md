# Component Catalog

What already exists. Do not rebuild these. Grep this file before creating a new component.

## Design System — `@/design-system/components/ui/`

Import path: `@/design-system/components/ui/{kebab-case-filename}`.

### Layout
- `Card` (+ Header, Title, Description, Action, Content, Footer)
- `AspectRatio`, `Separator`, `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`
- `Sidebar` (+ Provider, Header, Footer, Content, Menu, MenuItem, MenuButton, ResizeHandle)

### Inputs
- `Button` (+ `buttonVariants`)
- `Input`, `Textarea`
- `Select`, `NativeSelect`
- `Checkbox`, `Switch`, `Slider`, `RadioGroup`
- `Toggle`, `ToggleGroup`

### Feedback
- `Alert` (+ Title, Description, Action)
- `Badge`, `Progress`, `Skeleton`, `Spinner`
- `Toaster` (sonner — toasts go through `toast.success`/`toast.error` from `sonner`)
- `Empty` (+ Header, Title, Description, Content, Media)
- `ErrorPage` (+ Code, Title, Description, Actions)

### Navigation
- `Breadcrumb` (+ List, Item, Link, Page, Separator, Ellipsis)
- `Tabs` (+ List, Trigger, Content — variants: `default`/`line`)
- `Pagination`

### Data Display
- `Table` (+ Header, Body, Row, Head, Cell)
- `Avatar` (+ Image, Fallback, Badge, Group)
- `HoverCard`, `Tooltip`, `PointerTooltipContent`

### Overlay
- `Dialog`
- `Drawer`, `Sheet`, `Popover`
- `DropdownMenu` (+ Group, Label, Item, CheckboxItem, RadioGroup, RadioItem, Separator, Shortcut, Sub)
- `ContextMenu`
- `Command` (+ Dialog, Input, List, Group, Item, Shortcut)

### Typography
- `Kbd` (+ Group), `Markdown`, `TextShimmer`
- `Link` (+ `linkVariants`) — inline prose anchor; variants: `default` (markdown prose style), `muted` (inherits parent color)
- `CodeBlock` (+ Header, List, Trigger, Content, CopyButton)

### Form Integration
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`
- Re-exports `useForm` and `zodResolver`

### Particles
- This repo currently keeps behavior-enhanced controls close to their owning feature or under `apps/web/src/design-system/hooks/`; do not assume a separate particles package exists.

### Icons (`@/design-system/components/icons`)
- Hugeicons registry exports app icons as `XIcon`, `PlusIcon`, `PanelRightIcon`, etc.; local brand SVGs live in the same registry.

## Product components

**Inbox** (`apps/web/src/components/inbox/*`): `InboxShell`, `InboxSidebar`, `InboxList`, `DetailPane`, `ChatSlot`, `RunView`, `PanelPeek`, and supporting hooks/state.

**Audit** (`apps/web/src/components/audit/*`): `AuditPage` composes the shared inbox sidebar, detail close behavior, and chat slot.

**Chat** (`apps/web/src/components/chat/*` + `apps/web/src/ai-ui/*`): product chat panel composed from headless AI primitives.
