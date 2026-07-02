---
name: test-user-flows
description: Run user-facing flows through escalating personas using agent-browser, then fix confirmed issues and publish a Notion report. Use when asked to test, QA, verify, dogfood, 'run through', or 'see if it works' on a PR, stacked PRs, branch, or live flow before merge, especially when usability, accessibility, mobile, security, or lifecycle paths matter.
---

# test-user-flows

Test a change set the way many different real humans would, by **dispatching one agent-browser subagent per persona** against a live instance, **in sequence**, then **fixing everything they find** and documenting it. Every dispatched subagent — persona drivers, the explorer, and the fix agents — runs on **`Codex-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget). Browser-driving, data-layer judgment, threat-modeling, and writing fixes are all reasoning work, not small-model tasks.

**The core three always run, hardest-first:**

1. **Regular User** — competent, methodical. Exercises *every* flow the change touches, including the lifecycle flows nobody demoed (uninstall, disconnect, revoke, re-install, cancel). Establishes the authoritative flow inventory + finds first-order bugs.
2. **Frustrated User (bad day)** — impatient and annoyed. Re-runs the same flows while rage-clicking, refreshing, going back, abandoning, mashing, and feeding garbage. Finds robustness bugs the happy path hides.
3. **Novice ("barely used a computer")** — easily confused, doesn't know jargon, clicks the wrong thing, gets lost. Surfaces *usability friction* — where the flow is confusing, unguided, or unforgiving — so you learn what to make easier.

**Specialized personas — selected by relevance to the change** (not every run; see "Selecting personas" below):

4. **Accessibility User** — keyboard-only + screen-reader mental model. Names the structured defects behind the novice's findability/feedback gaps: focus order/traps, missing labels/ARIA, non-keyboard-reachable actions, color-only state, announce-on-change. *Select for UI-heavy changes.*
5. **Power User** — fast, keyboard-first, parallel tabs on purpose, bulk/rapid actions. Finds missing affordances, efficiency cliffs, and intentional-concurrency edges. *Select for keyboard/workflow tools.*
6. **Security Adversary** — systematic, deeper than the frustrated pass: injection (incl. **prompt-injection of free text into an LLM prompt** — how a real run found a Medium issue), authz/IDOR, cookie/token/param tampering, cross-tenant. *Select for auth / input / LLM-prompt features.*
7. **Mobile / Small-Screen / Touch** — narrow viewport + touch: off-screen controls (e.g. a save button pushed below the fold), tap-target size, scroll traps, viewport overflow. *Select for UI-heavy / mobile-used changes.*

The author tested the path they intended. These personas find the paths they didn't, the inputs they didn't expect, and the users they didn't design for — and then the gauntlet **fixes what they find** and records every change in the same report.

## When to use

- "Test / QA / verify / dogfood this PR (or stack, or branch)."
- "Run through the X flow and see if it works."
- Before merging a behavior change; when an author claims a flow works.

Not for: pure refactors with no user-facing change (typecheck/lint/tests suffice), or unit-test-only diffs. If nothing a user can reach changed, say so and stop.

## Prerequisites

- **A throwaway running instance** of the branch — never production or shared staging (the frustrated and security-adversary passes are destructive by design, and the fix phase writes to the codebase). See the `dev-box` skill.
- **agent-browser** available to every subagent. Each subagent loads its workflow content itself before driving:
  ```bash
  agent-browser skills get core        # snapshot→ref→act loop, sessions, auth, eval, cookies
  agent-browser skills get dogfood     # exploratory / bug-hunt patterns (frustrated/security/power lean on this)
  ```
- **notion-cli** (`ntn`) for the report deliverable — authenticated via `NOTION_API_TOKEN` (preferred) or `ntn login`, plus a **parent page id** to create the report page under. See the `notion-cli` skill. Verify both up front: a run with no Notion auth / no parent page can drive the flows but cannot deliver the report — surface that before starting, don't discover it at the end.
- The diff: `gh pr diff <n>` (per PR for a stack) or `git diff <base>...<head>`.
- **Auth for any third-party legs** the flows cross (e.g. an OAuth provider's consent screen, an app-install page). If a flow leaves your app for a site you can't sign into, you cannot drive it — establish that session up front or flag the flow as un-drivable.
- **A writable checkout + the project's verification command** for the fix phase — the gauntlet fixes what it finds (e.g. `bun run ci`, or the repo's typecheck/lint/test). If the codebase is read-only here, the fixes can't land — surface that up front.

## Core rule

**Coverage, honesty, and fixes are the deliverable, not a green run.** Every enumerated flow must be driven by every applicable persona, every finding reproduced and confirmed at the data layer (DB row / server log / network response) — never trusted from a UI toast — every flow you could *not* cover reported as loudly as the ones you did, and **every confirmed finding fixed and documented in the same report**. A clean happy path is the start of the work; fixing what the personas find is the end. The user's standing instruction: *"just fix everything they find every time, and let me know afterwards what changed in the same document."*

## Selecting personas

The **core three (1–3) always run.** Add specialized personas by **relevance to the change under test** — don't run all of them every time:

- **Accessibility (4) + Mobile (7)** — when the change is UI-heavy (new pages, forms, dialogs, menus, components).
- **Security Adversary (6)** — when the change touches auth, input handling, multi-tenant data, or **any free text that reaches an LLM prompt**.
- **Power User (5)** — when the change is a keyboard/workflow tool (shortcuts, command palette, bulk/list actions, a flow heavy users repeat).

State which specialized personas you selected and why, before dispatching. They run **after** the core three and **sequentially** (shared live instance), each against Pass 1's authoritative inventory.

## How it runs — the orchestration (you are the conductor)

You (the parent) do NOT drive the browser. You enumerate, dispatch the selected persona subagents **one at a time**, synthesize, then **dispatch fix subagents and document the fixes**. Run all persona passes **sequentially**, not in parallel: they share one live instance (concurrent sessions corrupt each other's state), and each pass is briefed with what the previous one found. Every dispatched subagent (persona drivers, explorer, fix agents) runs **`model: sonnet` (Codex-sonnet-4-6) with maximum extended thinking**.

Before Pass 1, pick a **run artifacts directory** (e.g. a temp dir) and pass it to every subagent. Each subagent **screenshots every step** it performs into `<artifacts>/<persona>/` with numbered, captioned filenames, and returns a screenshot manifest. Those screenshots become the body of the Notion report at synthesis — so the capture is mandatory, not optional.

Pipeline: **enumerate → core personas (+ selected specialists) → synthesize → fix-and-document → publish/append.**

### Phase 0 — Seed the flow inventory (parent, quick)

Pull the full diff and draft a first-cut flow list per [cookbook/enumerate-flows.md](cookbook/enumerate-flows.md). This seeds Persona 1; it does not have to be complete — Persona 1 will expand it. (Any explorer subagent you dispatch for blast radius runs on Sonnet + max thinking.)

### Pass 1 — Regular User → [cookbook/pass-1-regular-user.md](cookbook/pass-1-regular-user.md)

Dispatch a subagent (`model: sonnet`, max thinking) with the Regular-User brief. It **expands the inventory to the complete set** (explicitly hunting the lifecycle/terminal flows the team forgot), drives each end-to-end via agent-browser, confirms each at the data layer, and returns: the **authoritative flow inventory** + any first-order bugs. Wait for it to finish.

### Pass 2 — Frustrated User → [cookbook/pass-2-frustrated-user.md](cookbook/pass-2-frustrated-user.md)

Only after Pass 1 returns. Dispatch a subagent (`model: sonnet`, max thinking) with the Frustrated-User brief **plus Pass 1's inventory**. It re-runs each flow adversarially (the bad-day matrix), confirms at the data layer, and returns a bug list with classes + repros. Wait for it to finish.

### Pass 3 — Novice → [cookbook/pass-3-novice-user.md](cookbook/pass-3-novice-user.md)

Only after Pass 2 returns. Dispatch a subagent (`model: sonnet`, max thinking) with the Novice brief **plus Pass 1's inventory**. It attempts each flow as a confused first-timer and returns a *usability-friction* report (confusion points, dead ends, missing guidance) — these are UX findings, not crashes.

### Selected specialist passes (only those you picked) → passes 4–7

After the core three, run each **selected** specialist sequentially against Pass 1's inventory, fresh session, `model: sonnet` + max thinking:

- **Accessibility** → [cookbook/pass-4-accessibility-user.md](cookbook/pass-4-accessibility-user.md) — keyboard-only/SR a11y defects (their own axis).
- **Power User** → [cookbook/pass-5-power-user.md](cookbook/pass-5-power-user.md) — missing affordances, efficiency cliffs, concurrency edges.
- **Security Adversary** → [cookbook/pass-6-security-adversary.md](cookbook/pass-6-security-adversary.md) — injection/authz/tampering, with **prompt-injection** as an explicit cell.
- **Mobile / Small-Screen** → [cookbook/pass-7-mobile-small-screen.md](cookbook/pass-7-mobile-small-screen.md) — off-screen controls, tap targets, scroll traps.

### Synthesis (parent) → [cookbook/synthesize.md](cookbook/synthesize.md)

Merge every report that ran into one: a coverage matrix (flow × persona), confirmed correctness/security bugs with repro + root cause + data-layer evidence, and the friction lanes (usability/accessibility/efficiency/mobile) ranked by severity. **Resolve persona contradictions at the data layer** — never average ("sometimes works") — and distinguish product bugs from environment/config artifacts (an env artifact is NOT a product bug). Fail loud on any flow no persona could cover. This produces the fix list.

### Fix-and-document → [cookbook/fix-and-document.md](cookbook/fix-and-document.md)

The default end of the run. Dispatch fix subagents (`model: sonnet`, max thinking; one per finding-cluster, scoped to **disjoint files** so they parallelize safely) to implement **every confirmed finding** — correctness/security bugs AND high-value usability/a11y/mobile fixes — with tests where there's logic. Run the project's verification (typecheck/lint/tests/CI) until green.

### Publish + append (parent) → [cookbook/notion-report.md](cookbook/notion-report.md)

**Publish the report body as a new Notion page** via the notion-cli skill (matrix + bugs + friction lanes + resolved conflicts + gaps), with the per-persona, per-flow, step-by-step screenshot walkthrough — and **capture the page id**. Then **append a "Fixes applied" / "What changed" section to that SAME page**: per finding → files changed, what changed, why, test added, verification status; plus anything deliberately NOT fixed (with reason) and anything needing a human decision. Return the one Notion page URL as the deliverable.

## Briefing the subagents (do this every time)

Subagents start with empty context — brief each fully (see each pass cookbook for a ready-to-paste template). Every brief must include: **the dispatch directive `model: sonnet` (Codex-sonnet-4-6) with maximum extended thinking enabled**, the instance URL + how to authenticate, the diff / PR context, the flow inventory (every pass after Pass 1), the persona definition, the **run artifacts directory** (where to save screenshots), the explicit instruction to use the **agent-browser** skill, **screenshot every step**, and **confirm findings at the data layer**, plus the required structured return shape (findings + screenshot manifest). Give them browser-capable tools (Bash for the agent-browser CLI, Read/Grep) — not a read-only agent. The fix subagents get the same model + thinking directive and also need Write/Edit (they write production code). **No persona, explorer, or fix agent runs on anything but Sonnet with max thinking** — browser-driving, threat-modeling, and writing fixes are reasoning work.

## Cookbook & references

| File | Read when |
| --- | --- |
| [cookbook/enumerate-flows.md](cookbook/enumerate-flows.md) | Phase 0 — drafting the flow inventory from a diff/PR/branch |
| [cookbook/pass-1-regular-user.md](cookbook/pass-1-regular-user.md) | Briefing + running the Regular-User subagent (always) |
| [cookbook/pass-2-frustrated-user.md](cookbook/pass-2-frustrated-user.md) | Briefing + running the Frustrated-User subagent (always; adversarial matrix) |
| [cookbook/pass-3-novice-user.md](cookbook/pass-3-novice-user.md) | Briefing + running the Novice subagent (always; usability lens) |
| [cookbook/pass-4-accessibility-user.md](cookbook/pass-4-accessibility-user.md) | Selected for UI-heavy changes — keyboard-only / screen-reader a11y |
| [cookbook/pass-5-power-user.md](cookbook/pass-5-power-user.md) | Selected for keyboard/workflow tools — shortcuts, bulk, concurrency |
| [cookbook/pass-6-security-adversary.md](cookbook/pass-6-security-adversary.md) | Selected for auth / input / LLM-prompt features — injection, authz, tampering |
| [cookbook/pass-7-mobile-small-screen.md](cookbook/pass-7-mobile-small-screen.md) | Selected for UI-heavy / mobile-used changes — viewport, touch, off-screen controls |
| [cookbook/synthesize.md](cookbook/synthesize.md) | Merging the reports + resolving persona conflicts into the fix list |
| [cookbook/fix-and-document.md](cookbook/fix-and-document.md) | Dispatching fix subagents for every finding + appending "Fixes applied" |
| [cookbook/notion-report.md](cookbook/notion-report.md) | Publishing the report Notion page + appending the fixes to the same page |
| [references/agent-browser-gotchas.md](references/agent-browser-gotchas.md) | Concrete agent-browser techniques + traps (shared by all passes) |
