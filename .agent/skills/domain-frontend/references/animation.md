# Animation

The single source for motion rules in this codebase. For the enforceable MUST/SHOULD/NEVER list (compositor props only, no `transition: all`, etc.) see the Animation section in [ui-constraints.md](ui-constraints.md); the design philosophy below complements those rules.

## Purpose

- MUST use animation only to communicate state change or spatial relationship — never decoration
- MUST limit to one prominent animation at a time per view; competing motion destroys hierarchy
- MUST dim or de-emphasize the background when presenting modal or dialog overlays
- SHOULD default to no animation — add only when the interface is confusing without it
- Cap durations at 200ms for feedback, 400ms for view transitions

## Current State

`motion/react` is **not yet used** in application code. `tw-animate-css` **is used** for entrance animations via Tailwind classes. The patterns below are for new animation work when explicitly requested.

## tw-animate-css (What IS Used Today)

CSS-only entrance and micro-animations via Tailwind utility classes. These are already configured in the design system:

```tsx
<div className="animate-in fade-in slide-in-from-bottom-2">Content</div>

<div className="animate-out fade-out slide-out-to-top-2">Content</div>

<div className="animate-in fade-in duration-200 delay-100">Content</div>
```

Available animations: `fade-in`, `fade-out`, `slide-in-from-{direction}-{amount}`, `slide-out-to-{direction}-{amount}`, `zoom-in`, `zoom-out`, `spin-in`, `spin-out`.

## motion/react Patterns (For Future Use)

### AnimatePresence

Wrap conditional elements to animate entry and exit:

```tsx
import { AnimatePresence, motion } from 'motion/react';

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

Key rules:
- `mode="wait"` — wait for exit to complete before entering
- Always provide a unique `key` on the animated element
- Disable pointer events on exiting elements to prevent ghost clicks

### Springs vs Easing

| Use | Pattern |
|-----|---------|
| Gesture-driven motion (drag, flick) | Spring: `{ type: 'spring', stiffness: 300, damping: 30 }` |
| Interruptible animations | Spring (responds naturally to interruption) |
| Simple UI feedback (<200ms) | Easing: `{ duration: 0.15, ease: 'easeOut' }` |
| Progress indicators | Linear: `{ duration: 1, ease: 'linear' }` |

### Container Animation

Two-div pattern — outer animates size, inner holds content:

```tsx
import { useMeasure } from 'react-use';

function AnimatedContainer({ children }) {
  const [ref, { height }] = useMeasure();

  return (
    <motion.div
      animate={{ height: height || 'auto' }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      style={{ overflow: 'hidden' }}
    >
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}
```

## Timing Reference

| Context | Max duration |
|---------|-------------|
| Interaction feedback (hover, press) | 200ms |
| Panel/dialog entrance | 200ms |
| Page/route transition | 300ms |
| Stagger delay per item | 50ms |
| Active scale on pressable | 0.95-0.98 |

## Reduced Motion

Always respect `prefers-reduced-motion`:

```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  animate={{ opacity: 1, y: prefersReducedMotion ? 0 : 8 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
/>
```

Or use `motion/react`'s built-in `useReducedMotion()` hook.

## Key Files

- `packages/ui/design-system/src/styles/globals.css` — tw-animate-css configuration
- `packages/ui/design-system/src/components/ui/navigation-menu.tsx` — one of few motion/react uses in design system
