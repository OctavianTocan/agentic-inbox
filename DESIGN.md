---
version: alpha
name: Cogram Agentic Inbox
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
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 12px
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
---

## Overview

This system is a quiet, dense product UI for an AEC agentic inbox. It should
feel like an operational tool: crisp, calm, fast to scan, and ready for
repeated daily use. The current app is the product, not a showcase: first-run
triage, inbox review, detail inspection, approval/deny/undo, agent chat, and
Audit are the primary surfaces.

## Colors

The palette is neutral-first and follows the light Codex-like theme used in
the app: warm off-white surfaces, deep ink text, a muted coral accent, and a
deeper copper primary for filled controls with light text. There should be no
blue UI chrome. `secondary`, `muted`, and `accent` remain close to the surface
color so controls read as product chrome, not marketing decoration. Use
`success` sparingly for completed checks and `destructive` only for real risk.

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
pinned detail pane header, and a collapsible/resizable right agent panel.
Audit keeps the left sidebar for navigation while hiding inbox filters. Mobile
uses a compact top bar: menu, agent-search entry, and Audit icon.

## Elevation & Depth

Use the CSS elevation variables in `globals.css` for subtle hierarchy:
`--elevation-card`, `--elevation-card-sm`, and `--elevation-soft`. Shadows
should clarify layering without making panels look floaty or promotional.

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

Text controls that include inline icons must keep symmetric horizontal padding;
use component `gap` for icon/text spacing instead of reducing only the icon
side. Inline icons and logo marks that share a text line should size to
`1lh`, not `1em`, so they track the element's line-height and remain visually
aligned when leading changes. Keep standalone icon-only controls on explicit
square sizes.

## Do's and Don'ts

Do keep the UI quiet, readable, and action-oriented. Do use icon buttons for
panel toggles and text buttons for clear commands. Do preserve the reader's
scroll intent in streaming chat. Do use subtle edge fades only to clarify
sticky list titles. Do not add decorative gradient blobs, oversized marketing
heroes, nested cards, negative letter spacing, one-hue palettes, or blue
chrome.
