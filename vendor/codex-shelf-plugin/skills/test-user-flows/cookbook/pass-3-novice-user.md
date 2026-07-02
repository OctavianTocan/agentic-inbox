# Pass 3 — Novice ("barely used a computer")

## Context

The third subagent attempts the **same flows** as someone who has **barely used a computer** — your grandmother on a borrowed laptop. It will not crash the app on purpose; it will simply *struggle*, and every place it struggles is a place the product is harder than it needs to be. This pass produces **usability findings, not bugs**: confusing labels, hidden actions, missing feedback, jargon, dead ends, no way to recover from a wrong turn.

A flow can be 100% correct (Passes 1–2 all green) and still fail this pass — that's the point. Correctness and usability are different axes. Run it **only after Pass 2 returns**, against Pass 1's inventory, fresh session. The dispatched subagent runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget) — staying in a confused-novice mental model while still judging real friction is reasoning work.

## Persona

> Has barely used a computer. Doesn't know jargon ("OAuth", "token", "scope", "repository", "instance" mean nothing). Reads slowly and literally; takes button labels at face value. Easily intimidated — hesitates before clicking anything that sounds technical or permanent. Doesn't know a menu hides under "⋯" or that a page scrolled. Doesn't realize a new tab opened or that they got redirected to a different site. Clicks the most prominent thing, or the thing whose words match their goal — even if it's wrong. When confused, gets stuck rather than experimenting. Will not read documentation. Wants to do ONE simple thing and have the app guide them.

## What the subagent does

For each flow, it tries to accomplish the goal **using only what's on screen**, narrating its confusion at every step, and logs friction:

1. **Findability** — could a non-expert even locate where to start? Is the entry point obvious, or hidden behind an icon/menu/scroll with no label?
2. **Comprehension** — does each label/button/message make sense without jargon? Where did the wording assume knowledge the user lacks?
3. **Orientation** — at each step, does the user know *where they are*, *what just happened*, and *what to do next*? Redirects to a third-party site (GitHub consent), new tabs, and async waits are prime disorientation points — note them.
4. **Feedback** — after each action, is there clear confirmation? Silence (no toast, no state change visible) reads as "it's broken" to a novice, who then repeats the action.
5. **Recovery** — when they take a wrong turn or a step fails, can they tell, and can they get back? Dead ends, unexplained errors, and "now what?" moments are findings.
6. **Confidence / fear** — does anything look scary or irreversible with no reassurance (a "Disconnect" with no "are you sure / this is reversible" context)? Hesitation is a finding.

It rates each friction point by severity: **blocker** (a novice cannot complete the flow unaided) · **major** (completes but confused/anxious, likely to give up or mis-click) · **minor** (papercut). Each finding pairs with a concrete *make-it-easier* suggestion (clearer label, inline hint, confirmation, empty-state, progress indicator, success state).

## Ready-to-paste brief

```
You are testing a <PR/branch> as a NOVICE who has BARELY USED A COMPUTER, on a live instance.
Think: a grandparent on a borrowed laptop. No jargon knowledge. Reads literally. Takes labels at
face value. Doesn't know menus hide under icons or that the page scrolled or that a new tab/redirect
happened. Clicks the most prominent or most goal-matching thing. When confused, gets STUCK rather
than experimenting. Won't read docs.

DISPATCH: run on model: sonnet (claude-sonnet-4-6) with MAXIMUM extended thinking enabled.

INSTANCE: <url>   AUTH: <…>   (fresh agent-browser session)
CHANGE UNDER TEST: <…>
FLOW INVENTORY (attempt each as the goal a real person would have): <paste Pass 1 inventory>
ARTIFACTS DIR: <path> — save screenshots under <path>/novice/

Use the `agent-browser` skill. After each `snapshot`, narrate — in the persona's voice — what you
THINK you should do and why, what's confusing, and what you'd expect to happen. Then act on your
best (possibly wrong) guess, like the persona would. Your value is the confusion, not the success.
SCREENSHOT EVERY STEP to <path>/novice/NN-<flow>-<step>.png (zero-padded NN), especially each moment
of confusion / wrong turn / dead end — a screenshot of where a novice got stuck IS the finding.

This pass finds USABILITY FRICTION, not crashes. For each flow, log friction across: findability,
comprehension (jargon!), orientation (redirects/new tabs/waits), feedback (did anything confirm it
worked?), recovery (can they tell they went wrong and get back?), and fear (anything scary/irreversible
with no reassurance?).

RETURN (structured):
- PER-FLOW WALKTHROUGH: the persona's running narration of confusion + where they got stuck.
- FRICTION FINDINGS: each — flow · step · what confused the user · severity (blocker/major/minor)
  · concrete make-it-easier suggestion (label, hint, confirmation, empty-state, progress, success state).
- FLOWS A NOVICE COULD NOT COMPLETE UNAIDED: list them (these are the highest-value fixes).
- SCREENSHOT MANIFEST: ordered list of {flow, step, caption, path, friction-severity} for every shot saved.
```

## Done

Return the per-flow confusion walkthrough, the severity-rated friction findings each with a make-it-easier suggestion, and the list of flows a novice could not complete unaided. These feed the usability half of the synthesis — separate from the bug list.
