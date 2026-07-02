# Pass 5 — Power User (keyboard shortcuts, speed, parallel tabs)

## Context

A **specialized** pass — run it when the change is a keyboard/workflow tool: anything with shortcuts, command palettes, bulk actions, list/table operations, or a flow a heavy user repeats hundreds of times a day. The power user isn't trying to break the product like Pass 2; they're trying to go **fast**, and speed exposes a different class of defect: missing affordances (no shortcut where one is expected), efficiency cliffs (a 1-click task that secretly takes 6), and concurrency edges (two tabs on the same resource on purpose, not by accident).

Where Pass 2 (Frustrated) does annoying things *by reflex*, the power user does fast things *deliberately and competently* — they know exactly what they want and resent any friction between intent and result. Run **only after the core three return**, against Pass 1's inventory, fresh session. The dispatched subagent runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget).

## Persona

> Lives in the keyboard. Expects `Cmd/Ctrl+K` to open a command palette, `Enter` to submit, `Esc` to cancel, `j/k` or arrows to move through lists, `?` to show shortcuts. Opens things in new tabs on purpose to work two records at once. Selects many rows and acts on them in bulk. Repeats the same flow dozens of times and notices every extra click. Memorizes paths and deep-links straight to them. Tolerates power; resents hand-holding, modal nags, and "are you sure?" on routine actions. Will find the fastest route through your UI and complain about every step that route can't skip.

## What the subagent does (the power matrix)

For each flow, attempt the **fast** route and measure the friction between intent and result. For every cell: **predict** the efficient behavior, **do** the fast thing, **confirm** at the data layer where state changes, record ✅ or the defect.

| Move | How (agent-browser) | Hunts |
| --- | --- | --- |
| Keyboard shortcuts | try `Cmd/Ctrl+K`, `Enter`-to-submit, `Esc`-to-cancel, `?`-for-help, arrow/`j`/`k` nav | No shortcut where one is conventional; shortcut exists but is undiscoverable (no `?` overlay) |
| Enter / Esc semantics | submit a form with `Enter`; dismiss a dialog with `Esc` | `Enter` doesn't submit; `Esc` doesn't cancel; focus-trapped form needs the mouse to finish |
| Efficiency cliff | count the clicks/steps for a routine task; look for a faster path that should exist | A "quick" action buried behind a menu→submenu→dialog; no bulk path for an obviously-batchable task |
| Bulk / multi-select | select N rows, act once; or fire the action's `eval` over a list of ids | Per-item only, no bulk endpoint; bulk UI exists but loops N requests (N+1) instead of one call |
| Rapid repeat | run the same flow 10× back-to-back as fast as the UI allows | Per-iteration leak/slowdown; debounce that drops fast inputs; state that doesn't reset between runs |
| Parallel tabs (intentional) | two sessions/tabs editing the SAME resource on purpose | Lost update / last-write-wins with no conflict signal; one tab's stale view silently clobbers the other |
| Deep-link / back-forward | bookmark a deep route and return to it; use browser back/forward as navigation | Deep link 404s or loses required state; back/forward desyncs the UI from the URL |
| Optimistic UI vs truth | act fast, then immediately reload | Optimistic update shown but never persisted; UI and data disagree after a hard refresh |

A finding is a defect if: a conventional shortcut/affordance is **missing or undiscoverable**, a routine task has an **avoidable efficiency cliff**, an **obviously batchable** action has no bulk path (or fakes one with N requests), or **intentional concurrency** corrupts state / silently loses a write. Rate **major** (blocks or badly slows a heavy user — missing bulk path, lost-update clobber) vs **minor** (papercut — one extra click, missing `?` overlay). Each pairs with a concrete fix (add the shortcut, expose a bulk endpoint, collapse the step, add a conflict warning).

## Ready-to-paste brief

```
You are testing a <PR/branch> as a POWER USER on a live instance — fast, keyboard-first, competent.
You expect shortcuts (Cmd/Ctrl+K, Enter to submit, Esc to cancel, ? for help), work in multiple tabs
on purpose, select many things and act in bulk, repeat flows rapidly, and deep-link straight to pages.
You resent every avoidable click. You are NOT trying to break it (that's the frustrated pass) — you are
trying to go fast, and you notice every place the product can't keep up.

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

INSTANCE: <url>   AUTH: <…>   (fresh agent-browser session)
CHANGE UNDER TEST: <…>
FLOW INVENTORY (run each the FAST way): <paste Pass 1 inventory>
ARTIFACTS DIR: <path> — save screenshots under <path>/power/

Use the `agent-browser` skill (run `agent-browser skills get core` and `agent-browser skills get
dogfood`; read the gotchas reference). For concurrency cells, drive TWO sessions/tabs at once on the
same resource. Confirm state changes at the data layer (DB/log/network) — especially lost-update and
optimistic-vs-persisted checks. SCREENSHOT EVERY STEP to <path>/power/NN-<flow>-<move>.png (zero-padded
NN), capturing missing affordances, efficiency cliffs, and any concurrency clobber.

For each flow, walk the power matrix: keyboard shortcuts, Enter/Esc semantics, efficiency cliff
(count the clicks), bulk/multi-select, rapid repeat, intentional parallel tabs, deep-link & back/forward,
optimistic-UI-vs-truth. Pick the cells that physically apply.

For each applicable cell: predict the efficient/correct behavior, do the fast thing, confirm reality,
record ✅ or the defect (class + click-count where relevant). Rule out environment flakiness first.

RETURN (structured):
- PER-FLOW × PER-MOVE: ✅ / defect (class) / skipped(why); for efficiency cells, the click/step count.
- FINDINGS: each — flow · move · defect · severity (major/minor) · concrete fix (add shortcut,
  expose bulk endpoint, collapse a step, add conflict warning).
- CONCURRENCY BUGS: any lost-update / clobber with deterministic two-tab repro + data-layer evidence.
- SCREENSHOT MANIFEST: ordered list of {flow, move, caption, path, result} for every shot saved.
```

## Done

Return the per-flow × per-move matrix (with click counts for efficiency cells), the findings each with a concrete fix, and any concurrency bugs with two-tab repros + data-layer evidence. Concurrency bugs are **correctness** findings (they feed the bug lane); missing affordances and efficiency cliffs feed the usability/efficiency lane. Both become fixes the fix-and-document phase implements.
