---
name: domain-design
description: "Use when designing new features, reviewing UI mockups, evaluating page layouts, deciding what to build, scoping product requirements, simplifying interfaces, or applying Linear/Vercel-style design principles."
---

# Product Design Philosophy

Principles for *what* to build and *why*. For implementation patterns see `domain-frontend`.

## Codebase Anchors

Before proposing new visuals, check what the repo already has:

| Artifact | Path | Purpose |
|---|---|---|
| Design tokens | `packages/ui/design-system/src/styles/globals.css` | OKLch color vars, `--radius` / `--radius-sm`/`-md`/`-lg`/`-xl`, `--font-family-sans` (Geist), `--sidebar-*`, `--chart-1..5`. Dark mode variants under `.dark`. |
| Primitive components | `packages/ui/design-system/src/components/ui/<name>` | shadcn-style primitives (`button`, `card`, `dialog`, `input`, `popover`, `select`, `command`, `sheet`, `drawer`, `tooltip`, `data-table/*`, `accordion`, `avatar`, `badge`, `breadcrumb`, …). Import directly: `@ui/design-system/components/ui/button`. |
| Icons | `@ui/design-system/components/icons` | Central icon exports. Direct `lucide-react` imports belong inside the design-system icon registry. |
| Component catalog source | `apps/design/` | Browseable gallery source for primitives. Inspect source/catalog files instead of starting a dev server or browser unless explicitly requested. |
| Dark mode | `packages/ui/design-system/src/providers/theme.tsx` | `next-themes` provider, `attribute="class"`, `.dark` toggles token overrides. |
| Motion | see `domain-frontend`'s `references/animation.md` | Default to tw-animate-css `animate-in`/`animate-out` classes; reach for `motion/react` only when JS animation is explicitly required. No bespoke motion hooks. |

Rule of thumb: any raw hex, pixel value, or hand-rolled primitive in a PR is a signal to check the above first.

## Quick Reference

- Default answer to any addition is no; prove it should exist before building
- One primary action per view; neutrals plus one accent; max two font weights per surface
- Design the empty state first; cap nav surfaces at 5–7 items; avoid settings, pick the right default

## References

- **Visual Language** — color, borders, shadows, icons, spacing, dark mode, radius: [references/visual-language.md](references/visual-language.md)
- **Visual Polish** — concentric radius, shadow layering, button anatomy: [references/visual-polish.md](references/visual-polish.md)
- **Interaction Patterns** — speed, keyboard-first, progressive disclosure, feedback, navigation, drag-and-drop: [references/interaction-patterns.md](references/interaction-patterns.md)
- **Motion** — see `domain-frontend`'s [references/animation.md](../domain-frontend/references/animation.md) for the single source of motion rules (philosophy, durations, easings, springs)
