---
version: alpha
name: Agentic Inbox
description: Product-focused AI application system extracted from effect-api-layout.
colors:
  primary: "#a55a43"
  primary-foreground: "#fffaf7"
  background: "#f9f9f7"
  foreground: "#2d2d2b"
  card: "#fffefa"
  card-foreground: "#2d2d2b"
  secondary: "#efeee9"
  secondary-foreground: "#2d2d2b"
  muted: "#efeee9"
  muted-foreground: "#6f6a62"
  accent: "#f2e6df"
  accent-foreground: "#2d2d2b"
  destructive: "#a6543d"
  success: "#007846"
  border: "#ddd9d1"
  input: "#fffefa"
  ring: "#cc7d5e"
  sidebar: "#f0efeb"
  sidebar-foreground: "#2d2d2b"
  sidebar-accent: "#ebe8e1"
  sidebar-accent-hover: "#e7e4dc"
  sidebar-border: "#d8d4cc"
  dark-background: "#191815"
  dark-foreground: "#f4f1eb"
  dark-card: "#211f1b"
  dark-sidebar: "#171612"
  dark-sidebar-accent: "#2c2924"
  dark-sidebar-accent-hover: "#27231e"
typography:
  display:
    fontFamily: Manrope
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0
  h1:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0
  body:
    fontFamily: DM Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  label:
    fontFamily: DM Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  code:
    fontFamily: Fira Code
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
motion:
  panelDuration: 220ms
  interactionDuration: 150ms
  panelEase: cubic-bezier(0.32, 0.72, 0, 1)
zIndex:
  sticky: 10
  panelControls: 40
  overlays: 50
  pointerTooltip: 80
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 12px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    hoverBackgroundColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    transition: 150ms
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 12px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
  field:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 10px
  badge:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: 20px
    padding: 8px
  muted-panel:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 16px
  muted-caption:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
  accent-tab:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 12px
  destructive-alert:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: 16px
  success-badge:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: 20px
    padding: 8px
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  focus-ring:
    backgroundColor: "{colors.ring}"
    height: 3px
  sidebar-shell:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    accentColor: "{colors.sidebar-accent}"
    hoverColor: "{colors.sidebar-accent-hover}"
    collapsedWidth: 48px
    expandedDefaultWidth: 264px
  work-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    padding: 8px
  chat-panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    minWidth: 320px
    defaultWidth: 400px
    maxWidth: 560px
  pointer-tooltip:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    zIndex: 80
---

## Overview

This system is a quiet, dense product UI for a shared agentic inbox. It should
feel like an operational tool: crisp, calm, fast to scan, and ready for
repeated daily use. The current app is the product, not a showcase: first-run
triage, inbox review, detail inspection, approval/deny/undo, agent chat, and
Audit are the primary surfaces.

## Colors

The palette is neutral-first and follows the light Codex-like theme used in
the app: warm off-white surfaces, deep ink text, a muted coral accent, and a
deeper copper primary for filled controls with light text. There should be no
blue UI chrome. `secondary`, `muted`, `accent`, and `sidebar` remain close to
the surface color so controls read as product chrome, not marketing decoration.
Use `success` sparingly for completed checks and `destructive` only for real
risk. Dark mode is tokenized in `globals.css` and should stay warm, not pure
black; shadows in dark mode use inset highlights plus low-opacity depth.

## Typography

Typography follows the "dashboard" trio: Manrope for headings and display,
DM Sans for body, labels, and UI text, and Fira Code for code and command
text. Manrope's optical corrections keep dense dashboards legible; DM Sans
carries labels and descriptions with compact efficiency. Letter spacing stays
at `0`; do not use squeezed hero typography. Product panels should keep
headings compact and reserve display type for top-level pages.

## Layout

Prefer full-width product bands and resizable work panes over nested cards.
The desktop shell uses a collapsible/resizable left sidebar, an inbox list, a
pinned detail pane header, and a collapsible/resizable right agent panel. The
work panels sit high in the viewport on an 8px sidebar-colored backing; when
chat is collapsed, the work area exposes a compact top-right circle cutout for the
floating chat toggle. Audit keeps the left sidebar for navigation while hiding
inbox filters. Mobile uses a compact top bar: menu, agent-search entry, and
Audit icon.

## Elevation & Depth

Use the CSS elevation variables in `globals.css` for subtle hierarchy:
`--elevation-card`, `--elevation-card-sm`, `--elevation-soft`, and
`--elevation-soft-lifted`. The desktop chat cutout uses
`--elevation-cutout-curve`, an inverted version of the panel shadow language, so
the page chrome reads as carved into the right panel rather than pasted on top.
The shadow belongs only on the curved edge that cuts into the panel; the straight
right-side cover stays flat sidebar chrome. Keep the cutout centered around the
toggle button instead of the full header band. Shadows should clarify layering
without making panels look floaty or promotional. Pointer-follow resize tooltips
and hover peeks intentionally sit above top chrome and sticky list headers on the
overlay z-index layer.

## Shapes

The base radius is 8px. Small controls can use 4px; larger framed surfaces can
use 12px. Do not exceed this scale unless a source component already does it.

Nested rounded elements must use concentric radii: `outer = inner + padding`
(equivalently `inner = outer − padding`). Equal radii on a padded parent and
its rounded child read as wrong. Example: a `rounded-xl` (12px) surface with
`p-2` (8px) holds a `rounded-sm` (4px) child, not another `rounded-xl`. This
applies only to true nesting — the floating work panels sit on a flat,
non-rounded backing, so they are the outermost rounded surface and keep a
uniform 12px radius. Still avoid nested rounded rectangles that make panels
feel padded inside padding.

## Components

Default to local primitives from `apps/web/src/design-system/components/ui`
before adding new UI. AI chat surfaces build from the vendored `ai-ui`
primitives and local chat components. The default `/` route is the inbox
experience. The first-run screen can appear every visit for now and must keep
the page locked without stray mobile scroll.

The active design-system package for this repo lives under
`apps/web/src/design-system`; imports use the local `@/design-system/...` alias.
Icons come only from `@/design-system/components/icons`, whose registry wraps
Hugeicons plus local brand SVGs. Direct `@hugeicons/*`, `lucide-react`, or
Base UI imports belong inside the design-system layer, not app components.

Buttons use the Base UI-backed `Button` primitive with variants `default`,
`outline`, `secondary`, `ghost`, and `destructive`; sizes are `xs`, `sm`,
`default`, `lg`, `icon-xs`, `icon-sm`, `icon`, and `icon-lg`. Sidebar controls
use `SidebarMenuButton`, not generic buttons, so collapsed rail geometry and
tooltips stay consistent.

Text controls that include inline icons must keep symmetric horizontal padding;
use component `gap` for icon/text spacing instead of reducing only the icon
side. Inline icons and logo marks that share a text line should size to
`1lh`, not `1em`, so they track the element's line-height and remain visually
aligned when leading changes. Keep standalone icon-only controls on explicit
square sizes.

Sidebar hover states must keep typography metrically stable. Use color,
background, opacity, or transform for affordance; do not change font weight,
letter spacing, or text-shadow on hover/active states because those shift dense
navigation labels and make the rail feel jittery.

Motion is CSS-first. Use explicit transition properties only, keep interaction
feedback around 150ms, keep panel open/close around 220ms with `--ease-panel`,
and animate compositor-friendly properties (`transform`, `opacity`) for panels.
Layout-size animation is acceptable only for the existing resizable sidebar and
chat panel width transitions, where the width itself is the user-controlled
state.

The sidebar footer always carries a default reviewer profile. In collapsed
mode, the app icon, menu icons, profile avatar, and bottom reopen control share
the same 48px rail centerline so icons do not shift between open and closed
states.

## Do's and Don'ts

Do keep the UI quiet, readable, and action-oriented. Do use icon buttons for
panel toggles and text buttons for clear commands. Do preserve the reader's
scroll intent in streaming chat. Do use subtle edge fades only to clarify
sticky list titles. Do not add decorative gradient blobs, oversized marketing
heroes, nested cards, negative letter spacing, one-hue palettes, or blue
chrome.
