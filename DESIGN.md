---
version: alpha
name: Cogram AI App Template
description: Product-focused AI application system extracted from effect-api-layout.
colors:
  primary: "oklch(0.205 0.005 85)"
  primary-foreground: "oklch(0.985 0.003 85)"
  background: "oklch(0.984 0.003 85)"
  foreground: "oklch(0.145 0.005 85)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0.005 85)"
  secondary: "oklch(0.97 0.003 85)"
  secondary-foreground: "oklch(0.205 0.005 85)"
  muted: "oklch(0.97 0.003 85)"
  muted-foreground: "oklch(0.556 0.003 85)"
  accent: "oklch(0.97 0.003 85)"
  accent-foreground: "oklch(0.205 0.005 85)"
  destructive: "oklch(0.577 0.245 27.325)"
  success: "oklch(50.8% 0.118 165.612)"
  border: "oklch(0.946 0.001 85)"
  input: "oklch(1 0 0)"
  ring: "oklch(0.708 0.003 85)"
typography:
  display:
    fontFamily: Redaction
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0
  h1:
    fontFamily: Geist Sans
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0
  body:
    fontFamily: Geist Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  label:
    fontFamily: Geist Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  code:
    fontFamily: Geist Mono Variable
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

This system is a quiet, dense product UI for AI workflows. It should feel like
an operational tool: crisp, calm, fast to scan, and ready for repeated daily
use. The design source is `effect-api-layout`, especially the primitives now in
`apps/web/src/design-system`, the headless chat pieces in `apps/web/src/ai-ui`,
and the component catalog examples from `apps/design`.

## Colors

The palette is neutral-first and OKLCH-based, with strong contrast between
foreground and background and restrained accents. `primary` is near-black in
light mode and near-white in dark mode. `secondary`, `muted`, and `accent`
remain close to the surface color so controls read as product chrome, not
marketing decoration. Use `success` sparingly for completed checks and
`destructive` only for real risk.

## Typography

Use Geist Sans for almost everything, Geist Mono for code and command text, and
Redaction only when a screen needs a deliberate display moment. Letter spacing
stays at `0`; do not use squeezed hero typography. Product panels should keep
headings compact and reserve display type for top-level pages.

## Layout

Prefer full-width product bands with constrained inner content over nested
cards. Cards are for repeated records, compact tool surfaces, and framed
previews. Dense grids, sticky sidebars, stable toolbar sizes, and predictable
spacing are preferred over decorative compositions.

## Elevation & Depth

Use the CSS elevation variables in `globals.css` for subtle hierarchy:
`--elevation-card`, `--elevation-card-sm`, and `--elevation-soft`. Shadows
should clarify layering without making panels look floaty or promotional.

## Shapes

The base radius is 8px. Small controls can use 4px; larger framed surfaces can
use 12px. Do not exceed this scale unless a source component already does it.
Avoid nested rounded rectangles that make panels feel padded inside padding.

## Components

Default to local primitives from `apps/web/src/design-system/components/ui`
before adding new UI. AI chat surfaces should build from the vendored
`ai-ui` primitives and the shadcn chat primitives when installed:
`message-scroller`, `message`, `bubble`, `attachment`, and `marker`. The
default `/` route is a component showcase and should remain useful as a manual
visual smoke test.

## Do's and Don'ts

Do keep the UI quiet, readable, and action-oriented. Do use icon buttons for
tools and text buttons for clear commands. Do preserve the reader's scroll
intent in streaming chat. Do not add decorative gradient blobs, oversized
marketing heroes, nested cards, negative letter spacing, or one-hue palettes.
