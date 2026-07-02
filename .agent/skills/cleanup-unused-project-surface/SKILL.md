---
name: cleanup-unused-project-surface
description: "Audit and propose cleanup for unused backend code, frontend components, UI primitives, design assets, styles, and agent/design-system surface. Use when the user asks to remove dead code, prune unused components, clean up backend modules, trim design system cruft, or verify non-usage before deletion."
stages: [audit, cleanup]
benefits-from: [practice-code-quality, domain-design, domain-frontend, effect-v4-project-starter]
---

# Cleanup Unused Project Surface

Use this skill to prove what is unused before removing backend code, frontend
components, UI/design assets, styles, routes, package exports, or repo-local
skills.

## How It Works

Start with an audit. Build a removal ledger with exact search/type/build
evidence for each candidate, classify risk, and propose deletions. Do not delete
anything until the user approves the plan.

## Commands

| Command | Purpose |
| --- | --- |
| `/cleanup-unused-project-surface audit` | Find and prove unused code/assets/components. |
| `/cleanup-unused-project-surface remove` | Apply an approved removal plan and verify it. |

## Cookbook

Each command has a detailed step-by-step guide. **Read the relevant cookbook
file before executing a command.**

| Command | Cookbook | Use When |
| --- | --- | --- |
| audit | [cookbook/audit.md](cookbook/audit.md) | You need a deletion proposal with evidence. |
| remove | [cookbook/remove.md](cookbook/remove.md) | The user approved specific cleanup candidates. |

## Guardrails

- Treat dynamic imports, route conventions, generated files, CSS class strings,
  package exports, and framework naming conventions as live until proven
  otherwise.
- Prefer `rg`, TypeScript diagnostics, package exports, test coverage, and build
  output over intuition.
- Report uncertain candidates separately; uncertainty is not deletion evidence.
- Preserve generated/vendor/submodule surfaces unless the user explicitly asks
  to prune them.
