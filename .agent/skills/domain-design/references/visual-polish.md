# Visual Polish

Tailwind + design-system techniques for radius, shadows, and button layering. Everything here assumes the tokens defined in `packages/ui/design-system/src/styles/globals.css` (`--radius`, `--radius-sm`/`-md`/`-lg`/`-xl`, OKLch color vars) and the primitives in `packages/ui/design-system/src/components/ui/`.

The enforceable UI rules behind these techniques (concentric radius, default shadow scale, semi-transparent borders, hit-target sizing, never re-implementing a primitive) live in `domain-frontend`'s ui-constraints.md and design-system.md. This file is the design-side *why* plus the concrete Tailwind recipes; cite those for the rules rather than restating them.

Before reaching for bespoke CSS: inspect `apps/design/` source and the design-system component source to confirm a primitive doesn't already encode the polish you need. Do not start a dev server or browser for UI review unless the user explicitly asks.

## Concentric Radius

Equal radii on nested elements produce the "pillow" effect: the inner corner looks fatter than the outer one. A child reads as concentric only when its radius shrinks by the padding around it (`domain-frontend`'s ui-constraints.md owns the rule: inner = outer − gap/padding).

```tsx
// Bad — equal radii, pillow effect
<div className="rounded-lg p-1">
  <div className="rounded-lg" />
</div>

// Good — inner shrinks by the padding
<div className="rounded-lg p-1">
  <div className="rounded-sm" />
</div>
```

With `--radius: 0.5rem`, the scale maps to `globals.css` as `rounded-sm` → `--radius-sm` (4px), `rounded-md` → `--radius-md` (6px), `rounded-lg` → `--radius-lg` (8px), `rounded-xl` → `--radius-xl` (12px). The example is exact: 8px − 4px (`p-1`) = 4px. Pairing merely-adjacent steps (`lg` inside `xl`) is a quick heuristic that over-rounds the child whenever padding ≠ the gap between those tokens.

Tight layouts sometimes need `rounded-[min(var(--radius-md),Npx)]` clamps — see the `button` size variants in `button.tsx` for the pattern.

## Layered Shadows

A single `shadow-md` looks flat. Default to the elevation scale (`shadow-xs` / `shadow-sm` for cards, `shadow-md` / `shadow-lg` for overlays). For a custom stack, layer via an arbitrary variant — keep it on one line so Tailwind's JIT reads it as a single utility:

```tsx
<div className="shadow-[0_1px_2px_rgb(17_24_39_/_0.06),0_4px_8px_rgb(17_24_39_/_0.04),0_12px_24px_rgb(17_24_39_/_0.03)]" />
```

`domain-frontend`'s visual-language.md lists the shadow rules; the reasoning: offsets share one direction (a scene has one light source), the color is a deep neutral (`rgb(17 24 39 / α)` — slate-900, never pure black) so it sits over light and dark backgrounds, and in dark mode shadows nearly vanish so lean on borders or background shifts instead.

## Borders That Adapt

Hardcoded hex borders break in dark mode. `border-border` (maps to `--border`) is the default for card edges; `domain-frontend`'s design-system.md owns the semi-transparent-border rule.

```tsx
// Bad
<div className="border border-[#e5e5e5]" />

// Good
<div className="border border-border" />       // maps to --border
<div className="border border-black/10 dark:border-white/10" />  // fallback
```

Reach for the `border-black/10` / `border-white/10` fallback only when you need an edge slightly stronger or more translucent than the token gives.

## Use the Real Button Before Hand-Rolling

`packages/ui/design-system/src/components/ui/button.tsx` encodes the variants most pages need, and `domain-frontend` requires using it (never duplicate a primitive):

```tsx
import { Button } from '@ui/design-system/components/ui/button';

<Button>Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive">Delete</Button>
```

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`. Sizes: `xs`, `sm`, `default`, `lg`, plus `icon-xs` / `icon-sm` / `icon` / `icon-lg`. Focus ring, `aria-invalid` handling, disabled state, and inline-icon sizing are already wired up.

Only hand-roll for a *specifically* elevated CTA (e.g. a hero call-to-action with a top highlight) — genuine polish, not a re-implementation. Its layered-shadow anatomy:

```tsx
<button
  className={cn(
    'rounded-lg px-3 py-1.5 text-sm font-medium',
    'bg-gradient-to-b from-primary/[.96] to-primary text-primary-foreground',
    'shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08),inset_0_0_0_1px_rgb(255_255_255_/_0.04),0_0_0_0.5px_rgb(0_0_0_/_0.3),0_1px_2px_rgb(17_24_39_/_0.10),0_2px_4px_rgb(17_24_39_/_0.06),0_4px_8px_rgb(17_24_39_/_0.03)]',
  )}
/>
```

Six layers: top inner highlight, ambient inset, dark hairline "cut," and three external depth shadows. If you can see the gradient, it's too strong.

## Hit Target Expansion

When the visible element is smaller than the recommended 44px hit target, expand via a pseudo-element with negative inset (`domain-frontend`'s ui-constraints.md owns the rule):

```tsx
<a className="
  relative
  before:absolute before:-inset-y-2 before:-inset-x-3 before:content-['']
" />
```

This keeps the visual compact while satisfying touch targets, without inflating the layout.
