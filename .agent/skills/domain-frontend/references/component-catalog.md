# Component Catalog

What already exists. Do not rebuild these. Grep this file before creating a new component.

## Design System — `@ui/design-system/components/ui/`

Import path: `@ui/design-system/components/ui/{kebab-case-filename}`.

### Layout
- `AppShell` (+ Content, Footer)
- `AppHeader` (+ Content, Actions, Group, Title, Description, Toolbar, Nav)
- `Card` (+ Header, Title, Description, Action, Content, Footer)
- `BorderGrid`, `Frame`, `GridPage`, `Section`
- `SettingsCard` (+ Header, Title, Description, Action, Content, Footer, FooterText)
- `AspectRatio`, `Separator`, `ResizablePanel`

### Inputs
- `Button` (+ `buttonVariants`)
- `Input`, `Textarea`
- `Select`, `Combobox` (searchable, multi-select with chips), `NativeSelect`
- `Checkbox`, `Switch`, `Slider`, `RadioGroup`
- `Calendar`, `InputOTP`
- `InputGroup` (+ Addon, Button, Text, Input, Textarea)
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
- `NavigationMenu`, `Menubar`, `Pagination`
- `Sidebar` (+ Provider, Header, Footer, Content, Group, Menu, MenuItem, MenuButton, MenuAction, MenuSub, Rail, Trigger)

### Data Display
- `Table` (+ Header, Body, Row, Head, Cell)
- `DataTable` (+ Toolbar, Pagination, ActionBar, FacetedFilter, DateFilter, Skeleton, ViewOptions)
- `DataTable` cells: `Date`, `Boolean`, `Currency`, `Number`, `Duration`, `Link`, `Tags`
- `Avatar` (+ Image, Fallback, Badge, Group)
- `HoverCard`, `Tooltip`, `HybridTooltip`, `ShortcutTooltip`

### Overlay
- `Dialog`, `HybridDialog` (responsive: Dialog desktop, Drawer mobile)
- `HybridAlertDialog` (responsive confirmation)
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

### Particles (`@ui/design-system/components/particles/`)
- `CopyButton`, `ThemeToggle`

### Icons (`@ui/design-system/components/icons`)
- Central Icon System + lucide fallback (import as `XIcon`, `PlusIcon`, etc.) + brand icons

## Shared — `@comcom/app-shared/` (cross-platform)

**Hooks** (`@comcom/app-shared/hooks/*`): Sessions, access tokens, organizations, automations, billing — see `packages/comcom/app-shared/src/hooks/`.

**Providers** (`@comcom/app-shared/providers/router`): `RouterProvider`, `RouterLink`, `useNavigate`, `usePathname`, `useParams`, `useSearchParams`, `useLink`.

**Components**: `PostHogSessionIdentifier`.

## App Core — `@comcom/app-core/`

**Layout** (`@comcom/app-core/components/layout/*`): `TopBarSidebarTrigger`, `TopBarBreadcrumbs`, `TopBarSessionPanelTrigger` (compose with `TopBar`/`TopBarActions`/`TopBarSeparator` from `@ui/design-system/components/ui/top-bar`), `OrganizationMenu`, `AppSidebar` (+ Provider), `UserMenu`, `LogoLink`.

**Features** (`@comcom/app-core/features/{feature}/*`): `SearchDialog` (Cmd+K), `FeedbackDialog`, `ShortcutsHelpDialog`, `SessionPanel` (+ Trigger, Button, Root).

**Hooks** (`@comcom/app-core/hooks/*`): Org members, invitations, integrations, account sessions, agent chat — see `packages/comcom/app-core/src/hooks/`.
