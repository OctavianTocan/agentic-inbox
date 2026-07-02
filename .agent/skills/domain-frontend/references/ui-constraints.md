# UI Constraints

Apply these to all UI work. These are enforceable review rules, not suggestions.

## Pre-Ship Checklist

Run through before opening a PR; each item maps to a section below.

- [ ] `aria-label` on icon-only buttons
- [ ] `focus-visible` ring on all interactive elements
- [ ] Loading skeleton mirrors final layout structure
- [ ] Error and empty states with clear next action
- [ ] Early returns for loading/error/empty before happy path
- [ ] Lists with >50 items virtualized
- [ ] No layout reads in render (`getBoundingClientRect`, `offsetHeight`)
- [ ] `data-slot` on root element (design-system components)
- [ ] Concentric border-radius on nested rounded elements
- [ ] `text-balance` on headings, `text-pretty` on body paragraphs
- [ ] `tabular-nums` on numeric data

## Contents

- Stack
- Components
- Focus
- Forms
- Interaction
- Animation
- Typography
- Images
- Layout
- Navigation & State
- Touch & Interaction
- Performance
- Hydration
- Locale & i18n
- Data Flow
- Design
- Anti-patterns

## Stack

- MUST use Tailwind CSS defaults unless custom values already exist or are explicitly requested
- MUST use `motion/react` (formerly `framer-motion`) when JavaScript animation is required
- SHOULD use `tw-animate-css` for entrance and micro-animations in Tailwind CSS
- MUST use `cn` utility (`clsx` + `tailwind-merge`) for class logic

## Components

- MUST use accessible component primitives for anything with keyboard or focus behavior (`@ui/design-system/components/*`)
- MUST use the project's existing component primitives first — check [component-catalog.md](component-catalog.md) before building anything new
- MUST use default design system items (`DropdownMenuItem`, `CommandItem`, `SidebarMenuButton`, etc.) instead of custom-styled elements — never hand-write item styles that a component already provides
- NEVER use raw HTML elements (`<button>`, `<input>`, `<select>`, `<dialog>`, `<textarea>`) in app code — always use design system components
- NEVER import directly from `@base-ui/react`, `lucide-react`, or `@central-icons-react` in app code — use design system wrappers and icon re-exports (`@ui/design-system/components/icons`)
- NEVER duplicate a component that already exists in the design system — if it looks like a Button, Card, Badge, Spinner, Skeleton, or Empty state, it already exists
- MUST rely on built-in component spacing (e.g. `gap-1.5` in `DropdownMenuItem`, `gap-2` in `CommandItem`) instead of manual icon margins like `mr-2`
- NEVER mix primitive systems within the same interaction surface
- MUST add an `aria-label` to icon-only buttons
- NEVER rebuild keyboard or focus behavior by hand unless explicitly requested
- NEVER override a design-system primitive's internal look via `className` (colors, borders, typography, backgrounds, padding, margins, shadows, rings). Use the primitive's `variant`/`size`/data-attribute props or a documented slot. If no existing variant fits the need, add one to the primitive — don't work around it. Layout-only classes on the primitive's *outer* element are acceptable: `w-*`/`max-w-*`, `min-w-0` for truncation containers, grid/flex placement (`col-span-*`, `self-*`, `justify-*`), absolute/relative positioning, and `sr-only`. Internal styles belong to the design system.

## Focus

- MUST provide visible focus via `focus-visible:ring-*` or equivalent
- NEVER use `outline-none` without a `focus-visible` replacement
- MUST use `:focus-visible` over `:focus` (avoids focus ring on click)
- SHOULD use `:focus-within` for compound controls

## Forms

- MUST set `autocomplete`, meaningful `name`, and correct `type`/`inputmode` on inputs
- MUST make labels clickable (`htmlFor` or wrapping the control)
- SHOULD set `spellCheck={false}` on emails, codes, usernames
- MUST show errors inline next to fields; focus first error on submit
- SHOULD warn before navigation with unsaved changes (`beforeunload` or router guard)
- NEVER block paste in `input` or `textarea` elements
- SHOULD normalize and accept messy user input (extra spaces, mixed case, varied formats) rather than rejecting it

## Interaction

- MUST use an `AlertDialog` for destructive or irreversible actions
- SHOULD use structural skeletons for loading states
- NEVER use `h-screen`; use `h-dvh` (mobile Safari's URL bar breaks `100vh`)
- MUST respect `safe-area-inset` for fixed elements

## Animation

- NEVER add animation unless it is explicitly requested
- MUST animate only compositor props (`transform`, `opacity`)
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- NEVER use `transition: all` — list properties explicitly
- SHOULD avoid animating paint properties (`background`, `color`) except for small, local UI (text, icons)
- SHOULD use `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for view transitions
- NEVER exceed `200ms` for interaction feedback
- MUST pause looping animations when off-screen
- MUST respect `prefers-reduced-motion` (provide reduced variant or disable)
- MUST make animations interruptible — respond to user input mid-animation
- NEVER introduce custom easing curves unless explicitly requested
- SHOULD avoid animating large images or full-screen surfaces
- MUST NOT animate context menu or dropdown entrances — exit-only animation
- MUST NOT animate focus movement during keyboard navigation — instant transitions
- MUST NOT animate high-frequency interactions (rapid toggling, typing feedback)
- SHOULD use spring physics (not easing curves) for gesture-driven motion (drag, flick) and interruptible animations
- SHOULD add `:active` scale transform (0.95-0.98) on pressable elements when animation is used
- SHOULD keep stagger delays under 50ms per item when animating lists
- SHOULD use linear easing only for progress indicators and time-based representations
- SHOULD prefer the View Transitions API over JS animation libraries for page/route transitions when browser support allows

## Typography

- MUST use `text-balance` for headings and `text-pretty` for body/paragraphs
- MUST use `tabular-nums` for numeric data
- MUST use `…` in rendered UI text (labels, buttons, toasts, modals) — not `...`
- MUST use `...` in HTML attributes (`placeholder`, `title`, `alt`) — the `…` character renders incorrectly in some contexts
- Loading text MUST end with `…` (`"Saving…"`, `"Loading…"`)
- Curly quotes `"` `"` not straight `"` in UI text
- SHOULD use non-breaking spaces for units (`10 MB`, `⌘ K`)
- SHOULD use `truncate` or `line-clamp` for dense UI
- MUST ensure flex children have `min-w-0` to allow text truncation
- NEVER modify `letter-spacing` (`tracking-*`) unless for uppercase or small-caps text, where SHOULD add slight positive tracking
- SHOULD use `underline-offset` to clear descenders on text links
- MUST use `font-display: swap` for custom fonts to avoid invisible text during load
- SHOULD disable `font-synthesis` when using variable fonts to prevent faux bold/italic
- SHOULD use `slashed-zero` (`font-variant-numeric: slashed-zero`) in code-adjacent UIs

## Images

- MUST set `priority` on above-fold hero/LCP images
- MUST provide `alt` on all images (`alt=""` if decorative)

## Layout

- MUST use a fixed `z-index` scale (no arbitrary `z-*`)
- SHOULD use `size-*` for square elements instead of `w-*` + `h-*`

## Navigation & State

- MUST reflect UI state in URL — filters, tabs, pagination via query params
- MUST default to TanStack Router `validateSearch` plus a page-local search hook for URL state on routes you own; use `nuqs` only for primitive scalars when `validateSearch` is unavailable, and never use manual `useSearchParams` state sync
- MUST use `<Link>` (or `RouterLink` from `@comcom/app-shared/providers/router`) for navigation — supports Cmd/Ctrl+click, middle-click

## Touch & Interaction

- SHOULD set `touch-action: manipulation` on interactive surfaces (prevents double-tap zoom delay)
- MUST set `overscroll-behavior: contain` in modals/drawers/sheets
- SHOULD use `autoFocus` sparingly — desktop only, single primary input
- SHOULD use pseudo-elements with negative inset for expanded hit targets when the visible element must remain small

## Performance

- MUST virtualize large lists (>50 items) — use `virtua` or `content-visibility: auto`
- NEVER read layout in render (`getBoundingClientRect`, `offsetHeight`, `scrollTop`)
- SHOULD prefer uncontrolled inputs; controlled inputs must be cheap per keystroke
- NEVER animate large `blur()` or `backdrop-filter` surfaces
- NEVER apply `will-change` outside an active animation
- NEVER use `useEffect` for anything that can be expressed as render logic

## Hydration

- Inputs with `value` MUST have `onChange` (or use `defaultValue` for uncontrolled)
- MUST guard date/time rendering against hydration mismatch (render on client or use `suppressHydrationWarning`)

## Locale & i18n

- MUST use `Intl.DateTimeFormat` — NEVER hardcode date formats
- MUST use `Intl.NumberFormat` — NEVER hardcode number/currency formats

## Data Flow

- MUST use early returns for loading, error, and empty states before the happy path
- SHOULD call hooks at the point of use — pass IDs not full objects when children can fetch their own data
- NEVER drill data props through 2+ component levels — use hooks or context instead

## Design

- NEVER use gradients unless explicitly requested
- NEVER use purple or multicolor gradients
- NEVER use glow effects as primary affordances
- SHOULD use Tailwind CSS default shadow scale unless explicitly requested
- MUST give empty states one clear next action
- SHOULD limit accent color usage to one per view
- SHOULD use existing theme or Tailwind CSS color tokens before introducing new ones
- MUST use concentric radius: inner radius = outer radius minus gap/padding for nested rounded elements
- SHOULD use semi-transparent borders (`border-black/10`, `border-white/10`) to adapt to any background

## Anti-patterns

React and component-authoring patterns that come up often enough to list explicitly. For universal TypeScript rules (type casts, barrel files, boolean naming, nested conditionals), activate `practice-code-quality`.

| Don't | Do instead |
|-------|-----------|
| `forwardRef` | Base UI `render` prop (`<Trigger render={<Button />}>`). React 19 does not need `forwardRef`. |
| `export default` | Named exports (except Next.js pages/layouts) |
| Prop drilling 2+ levels | Custom hooks or React context |
| Raw `Sheet` or `Drawer` | `HybridDialog` (responsive) |
| `interface` for component props | `type` alias |
| `useEffect` for derived state | Compute in render |
| Fire-and-forget async in handlers | try/catch with toast or mutation `onError` |
