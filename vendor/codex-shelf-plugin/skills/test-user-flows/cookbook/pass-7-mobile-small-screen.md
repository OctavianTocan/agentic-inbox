# Pass 7 — Mobile / Small-Screen / Touch

## Context

A **specialized** pass — run it when the change is UI-heavy and the product is used on phones or narrow windows. It attempts the **same flows** Pass 1 mapped, but in a **narrow viewport with touch**, where the desktop layout's assumptions quietly fail: a primary action gets pushed below the fold, a fixed header eats half the screen, a control overflows off-screen, a tap target is too small to hit, or a scroll region traps the page.

The classic finding this pass exists to catch: **a save/submit button pushed below the fold** on a small screen, so the user fills the form and never sees the button that commits it — the flow is "complete" on desktop and silently dead on mobile. Correctness can be green and this pass still fails.

Run **only after the core three return**, against Pass 1's inventory, fresh session in a small viewport. The dispatched subagent runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget).

## Persona

> On a phone (or a narrow browser window), using thumbs. Sees one column at a time; the rest is off-screen and must be scrolled to. Has a fat finger — small or closely-spaced targets get mis-tapped. Doesn't realize a control exists if it's below the fold or off to the side. Hates pinch-zooming to read or tap. Loses their place when a sticky header/footer covers content or a modal can't be scrolled. Expects the thing they need to be reachable with a thumb without hunting.

## What the subagent does (the small-screen matrix)

Set a narrow viewport first (e.g. `375×667`, iPhone-class) and emulate touch. For each flow, attempt it and audit layout/reachability at each step. For every cell: **predict** the mobile behavior, **drive** it, **inspect** the rendered layout (is the control on-screen? big enough? reachable?), record ✅ or the defect.

| Check | How (agent-browser) | Hunts |
| --- | --- | --- |
| Below-the-fold actions | after each form/dialog renders, check whether the primary button is in the initial viewport | **Save/submit pushed below the fold** — user can't find the commit action (the canonical bug) |
| Off-screen / overflow | snapshot the layout; check for horizontal overflow or controls clipped past the viewport edge | Content wider than the screen; controls cut off; horizontal scroll where there shouldn't be |
| Tap-target size | measure interactive element box sizes / spacing | Targets < ~44px or so close together that the wrong one is hit |
| Scroll traps | open a modal/long sheet; try to scroll the content and the page behind it | Modal body can't scroll to its own button; body-scroll-lock traps the user; nested scroll fights |
| Sticky chrome occlusion | with a fixed header/footer, check what content/controls it covers | Sticky bar hides the field being typed into or the action button |
| Viewport meta / zoom | check the page respects device width and isn't forcing desktop width | Desktop-width layout shrunk to unreadable; user must pinch-zoom to use it |
| Touch-only gestures | flows that assume hover/right-click | Action only available on hover/right-click — unreachable by touch |
| Orientation / resize | rotate / resize mid-flow | Layout breaks on rotate; in-progress input lost on reflow |

Rate **blocker** (a mobile user cannot complete the flow — the commit control is unreachable, the modal can't be scrolled to its button) · **major** (completes but painfully — must pinch-zoom, mis-taps, hunts off-screen) · **minor** (papercut — slightly small target, minor overflow). Each pairs with a concrete fix (move the action into the viewport / a sticky action bar, enlarge the target, fix the scroll container, add the viewport meta).

## Ready-to-paste brief

```
You are testing a <PR/branch> on a PHONE — a narrow viewport with touch — on a live instance.
You see one column; everything else is off-screen until you scroll. You tap with a thumb (fat finger).
You don't know a control exists if it's below the fold or off-screen. You hate pinch-zooming. A modal
you can't scroll to its button is a dead end.

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

INSTANCE: <url>   AUTH: <…>   (fresh agent-browser session)
CHANGE UNDER TEST: <…>
FLOW INVENTORY (attempt each on a small screen): <paste Pass 1 inventory>
ARTIFACTS DIR: <path> — save screenshots under <path>/mobile/

Use the `agent-browser` skill (run `agent-browser skills get core`; read the gotchas reference). FIRST
set a narrow mobile viewport (e.g. 375x667) and emulate touch — every screenshot must be at that size.
After each form/dialog/page renders, CHECK whether the primary action (save/submit/next) is within the
initial viewport WITHOUT scrolling — the canonical bug is a commit button pushed below the fold.
SCREENSHOT EVERY STEP to <path>/mobile/NN-<flow>-<check>.png (zero-padded NN) at the mobile viewport,
capturing any off-screen control, tiny target, scroll trap, or occluded field — that screenshot IS the
finding.

For each flow, walk the small-screen matrix: below-the-fold actions, off-screen/overflow, tap-target
size, scroll traps, sticky-chrome occlusion, viewport-meta/zoom, touch-only gestures (hover/right-click),
orientation/resize. Pick the checks that physically apply.

For each applicable check: predict the mobile behavior, drive it, inspect the rendered layout, record
✅ or the defect (class + which control). Rule out environment flakiness before blaming the diff.

RETURN (structured):
- PER-FLOW × PER-CHECK: ✅ / defect (class) / skipped(why), with the offending control + viewport.
- MOBILE FINDINGS: each — flow · step · defect · severity (blocker/major/minor) · concrete fix
  (move action into viewport / sticky action bar, enlarge target, fix scroll container, add viewport meta).
- FLOWS A MOBILE USER COULD NOT COMPLETE: list them (highest-value fixes).
- SCREENSHOT MANIFEST: ordered list of {flow, check, caption, path, severity} for every shot saved.
```

## Done

Return the per-flow × per-check matrix, the severity-rated mobile findings each with a concrete fix, and the flows a mobile user could not complete. These feed the **mobile/responsive** lane of the synthesis (its own axis), and each blocker/major becomes a fix the fix-and-document phase implements — a below-the-fold commit button is a blocker, not a papercut.
