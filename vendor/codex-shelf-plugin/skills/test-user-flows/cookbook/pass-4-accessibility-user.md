# Pass 4 — Accessibility User (keyboard-only + screen-reader mental model)

## Context

A **specialized** pass — run it when the change is UI-heavy (new pages, forms, dialogs, menus, interactive components), not on every gauntlet. It attempts the **same flows** Pass 1 mapped, but with the constraints of a user who **never touches the mouse** and who **builds their mental model of the page from what a screen reader would announce**, not from what's painted on screen.

This is the structured, reproducible version of the friction Pass 3 (Novice) stumbles into by accident: where the novice *felt* lost because a control was hidden or unlabeled, this pass *names the defect* — focus order is wrong, the control has no accessible name, the action isn't keyboard-reachable, the state change is never announced. Correctness can be 100% green and this pass still fails — accessibility is its own axis.

Run it **only after the core three return** (it consumes Pass 1's inventory) on the same instance, fresh session. The dispatched subagent runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget) — judging focus order and announce-on-change against the DOM/ARIA is reasoning work, not a small-model task.

## Persona

> Navigates entirely by keyboard — `Tab` / `Shift+Tab` to move, `Enter` / `Space` to activate, `Esc` to dismiss, arrow keys inside composite widgets. Cannot see the layout; "knows" the page only from accessible names, roles, and live-region announcements. A button with no label is an unlabeled mystery; an icon-only control is silence. A `<div onClick>` that isn't focusable simply does not exist to them. When focus jumps somewhere invisible, or gets trapped in a modal with no escape, or a result appears with no announcement, they are stuck with no way to know why.

## What the subagent does (the a11y matrix)

For each flow, attempt it keyboard-only and audit the accessibility-tree representation at each step. For every cell: **predict** the accessible behavior, **drive** it via keyboard, **inspect** the accessibility snapshot / ARIA, record ✅ or the defect class.

| Check | How (agent-browser) | Hunts |
| --- | --- | --- |
| Keyboard reachability | `Tab` through the whole flow; never use a coordinate click | Actions reachable only by mouse (`<div onClick>` with no `tabindex`/role); dead controls |
| Focus order | snapshot the accessibility tree; compare tab sequence to visual/logical order | Focus jumps around illogically; focus lands on nothing visible; order contradicts reading order |
| Focus trap / escape | open a modal/menu, try `Esc` and `Tab` past the end | Focus escapes a modal into the page behind it; OR trap with no `Esc`, can't get out |
| Accessible name | inspect each interactive node's name/role in the a11y snapshot | Icon-only buttons with no `aria-label`; inputs with no associated `<label>`; ambiguous "Click here" |
| Announce-on-change | trigger a state change (submit, error, async result); check for a live region | Result/error never announced (no `aria-live`/`role="alert"`); SR user thinks nothing happened |
| Form errors | submit invalid; inspect how the error associates to the field | Error shown only by color/position; not linked via `aria-describedby`; not announced |
| Contrast / non-color signal | check whether state is conveyed by color alone | Status communicated only by color (red/green) with no text/icon — invisible to low-vision users |
| Skip / landmark structure | inspect headings + landmark roles | No heading hierarchy or landmarks to orient by; everything is one undifferentiated `<div>` soup |

Rate each finding: **blocker** (an a11y user cannot complete the flow unaided — unreachable action, inescapable trap, unlabeled required control) · **major** (completes but blind to what happened — silent state change, unannounced error) · **minor** (papercut — suboptimal order, missing landmark). Pair each with a concrete fix (add `aria-label`, wire `aria-describedby`, add `role="alert"`, make the control a real `<button>`, fix `tabindex`).

## Ready-to-paste brief

```
You are testing a <PR/branch> as a KEYBOARD-ONLY / SCREEN-READER user on a live instance.
You NEVER use the mouse. You perceive the page ONLY through its accessibility tree — accessible
names, roles, and live-region announcements — not its visual layout. An unlabeled control is a
mystery; a non-focusable action does not exist to you; a silent state change means "nothing happened".

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

INSTANCE: <url>   AUTH: <…>   (fresh agent-browser session)
CHANGE UNDER TEST: <…>
FLOW INVENTORY (attempt each keyboard-only): <paste Pass 1 inventory>
ARTIFACTS DIR: <path> — save screenshots under <path>/accessibility/

Use the `agent-browser` skill (run `agent-browser skills get core`; read the gotchas reference).
Drive EVERYTHING by keyboard (Tab/Shift+Tab/Enter/Space/Esc/arrows) — no coordinate clicks. After each
step, snapshot the ACCESSIBILITY TREE and inspect names/roles/ARIA, not just pixels. SCREENSHOT EVERY
STEP to <path>/accessibility/NN-<flow>-<check>.png (zero-padded NN), capturing the focus indicator and
any moment focus is lost/trapped/unannounced — that screenshot IS the finding.

For each flow, walk the a11y matrix: keyboard reachability, focus order, focus trap/escape, accessible
name (labels/ARIA), announce-on-change (aria-live/role=alert), form-error association, color-only state,
landmark/heading structure. Pick the checks that physically apply.

For each applicable check: predict the accessible behavior, drive it, inspect the a11y tree, record ✅
or the defect (class + which node). Rule out environment flakiness before blaming the diff.

RETURN (structured):
- PER-FLOW × PER-CHECK: ✅ / defect (class) / skipped(why), with the offending node (selector/role/name).
- A11Y FINDINGS: each — flow · step · defect · severity (blocker/major/minor) · concrete fix
  (aria-label, aria-describedby, role=alert, real <button>, tabindex, label association).
- FLOWS A KEYBOARD/SR USER COULD NOT COMPLETE UNAIDED: list them (highest-value fixes).
- SCREENSHOT MANIFEST: ordered list of {flow, check, caption, path, severity} for every shot saved.
```

## Done

Return the per-flow × per-check matrix, the severity-rated a11y findings each with a concrete fix, and the flows a keyboard/SR user could not complete unaided. These feed the **accessibility** lane of the synthesis (its own axis, alongside correctness and general usability), and each blocker/major becomes a fix the fix-and-document phase implements.
