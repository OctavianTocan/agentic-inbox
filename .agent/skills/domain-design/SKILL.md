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
| Design tokens | `apps/web/src/design-system/styles/globals.css` | Warm light/dark CSS vars, `--radius`, `--top-bar-height`, `--sidebar-*`, `--chart-1..5`, elevation stacks, motion durations/easings, and Tailwind `@theme inline` exports. |
| Primitive components | `apps/web/src/design-system/components/ui/<name>` | Base UI / shadcn-style primitives (`button`, `badge`, `drawer`, `dropdown-menu`, `hover-card`, `resizable`, `sidebar`, `tooltip`, etc.). Import app code through `@/design-system/components/ui/button`. |
| Icons | `@/design-system/components/icons` | Hugeicons-backed registry plus local brand SVGs. Direct `@hugeicons/*` imports belong only inside the icon registry. |
| Component catalog source | `apps/web/src/design-system/components/ui/` | There is no separate gallery app in this repo; inspect primitive source and existing product screens before adding new visuals. |
| Dark mode | `apps/web/src/design-system/styles/globals.css` | `.dark` toggles token overrides; current app is light-first but dark tokens exist and should stay warm. |
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
