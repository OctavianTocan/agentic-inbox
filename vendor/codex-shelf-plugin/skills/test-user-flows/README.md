# test-user-flows

A Claude agent **skill**: a multi-persona browser QA gauntlet that drives every user flow a PR / stacked PRs / branch touches against a live instance, **auto-fixes everything it finds**, and delivers one Notion page carrying both the per-persona screenshot report and a "Fixes applied" section.

The author tested the path they intended. This skill finds the paths they didn't, the inputs they didn't expect, and the users they didn't design for — then fixes them.

## How it works

The parent agent is the conductor; it never drives the browser itself. It enumerates the flows, dispatches one **agent-browser** subagent per persona **in sequence** (they share one live instance, so concurrent sessions would corrupt each other's state), synthesizes the findings, then dispatches fix subagents and documents the result.

Every dispatched subagent — persona drivers, the codebase explorer, and the fix agents — runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget). Browser-driving, data-layer judgment, threat-modeling, and writing fixes are reasoning work.

```
enumerate → core personas (+ selected specialists) → synthesize → fix-and-document → publish/append
```

Findings are confirmed at the **data layer** (DB row / server log / network response), never trusted from a UI toast. Coverage, honesty, and fixes are the deliverable — not a green run.

## Persona roster

**The core three always run** (hardest-first):

1. **Regular User** — competent, methodical; exercises every flow including the lifecycle ones the team forgot (uninstall, disconnect, revoke, re-install, cancel). Establishes the authoritative flow inventory.
2. **Frustrated User (bad day)** — impatient; rage-clicks, refreshes, goes back, feeds garbage. Finds robustness bugs the happy path hides.
3. **Novice** — barely used a computer; gets confused and stuck. Surfaces usability friction.

**Specialized personas — selected by relevance to the change under test:**

4. **Accessibility User** — keyboard-only + screen-reader mental model. *Select for UI-heavy changes.*
5. **Power User** — shortcuts, bulk actions, intentional parallel tabs. *Select for keyboard/workflow tools.*
6. **Security Adversary** — injection (incl. LLM prompt-injection), authz/IDOR, token/param tampering, cross-tenant. *Select for auth / input / LLM-prompt features.*
7. **Mobile / Small-Screen / Touch** — narrow viewport, touch targets, off-screen controls. *Select for UI-heavy / mobile-used changes.*

## Auto-fix + Notion report

After synthesis, fix subagents (one per finding-cluster, scoped to disjoint files so they parallelize) implement **every confirmed finding** — correctness/security bugs and high-value usability/a11y/mobile fixes — with tests where there's logic, then the project's verification runs until green. A **"Fixes applied" section is appended to the SAME Notion page** the report was published to: per finding → files changed, what changed, why, test added, verification status; plus anything deliberately not fixed (with reason) and anything needing a human decision.

## Conflict resolution

Personas can contradict each other (one says a flow works, another says it's broken). Synthesis **investigates and resolves** the conflict at the data/log layer and distinguishes **product bugs from environment/config artifacts** — never averaging to "sometimes works", never reporting an env artifact as a product bug.

## Layout

```
SKILL.md                                  the conductor's playbook (start here)
cookbook/
  enumerate-flows.md                      Phase 0 — seed the flow inventory from a diff
  pass-1-regular-user.md                  core
  pass-2-frustrated-user.md               core
  pass-3-novice-user.md                   core
  pass-4-accessibility-user.md            specialized (UI-heavy)
  pass-5-power-user.md                    specialized (keyboard/workflow)
  pass-6-security-adversary.md            specialized (auth/input/LLM)
  pass-7-mobile-small-screen.md           specialized (UI-heavy/mobile)
  synthesize.md                           merge + resolve conflicts → fix list
  fix-and-document.md                     fix every finding + append to the report
  notion-report.md                        publish the report page + append the fixes
references/
  agent-browser-gotchas.md                driving + data-layer verification traps
```

## How it's invoked

It's a Claude agent skill, triggered when you ask to **test / QA / verify / dogfood / "run through" / "see if it works"** on a PR, a stack of PRs, or a branch — especially before merge or when an author claims a flow works.

## Prerequisites

- A **throwaway running instance** of the branch (never production/shared staging — the adversarial passes are destructive and the fix phase writes to the codebase).
- **agent-browser** available to every subagent.
- **notion-cli** (`ntn`) authenticated, plus a parent page id to nest the report under.
- A **writable checkout + the project's verification command** for the fix phase.
