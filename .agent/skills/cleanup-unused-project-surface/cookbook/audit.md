# Audit Unused Surface

## Context

Use this when the user wants to clean unused backend code, frontend components,
UI primitives, design-system files, styles, assets, routes, package exports, or
agent skills.

## Input

The user may provide a scope such as `backend`, `frontend`, `design-system`,
`skills`, or a specific folder. If they do not, audit the first-party app and
package surfaces and skip `vendor/`, `.agent/` internals, `.codegraph/`,
`.next/`, `node_modules/`, and generated output.

## Steps

### 1. Map Candidate Surfaces

List candidate files by category:

```bash
rg --files apps packages .agent/skills \
  -g '!vendor/**' \
  -g '!.agent/data-layer/**' \
  -g '!**/.next/**' \
  -g '!**/node_modules/**'
```

Identify exported symbols, route files, package export maps, asset directories,
CSS entrypoints, and barrel files before judging usage.

### 2. Prove Usage Or Non-Usage

For each candidate, gather at least two evidence types when possible:

- `rg` exact import/reference search for file paths and exported symbol names.
- TypeScript diagnostics after temporary import/export removals only in a
  scratch patch.
- Package `exports` and workspace dependency references in `package.json`.
- Next.js route/layout conventions and file-system routing.
- CSS token/class usage via string search, including `className`, `cn`, and
  design-system variant maps.
- Test/build coverage that would fail if the surface were removed.

Do not count references inside the candidate file itself as usage.

### 3. Classify Candidates

Build a ledger with these columns:

| Candidate | Category | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| path or symbol | backend/frontend/design/skill | exact commands and result summary | low/medium/high | remove/keep/investigate |

Risk guide:

- Low: no references, no exports, no route/framework convention, build-safe.
- Medium: no direct references but possible dynamic/config use.
- High: framework convention, public export, route, asset path, or unclear
  runtime coupling.

### 4. Propose The Removal Plan

Group removals into small batches. Include:

- Files or exports to delete.
- Imports/package entries to update.
- Verification commands to run after deletion.
- Candidates intentionally kept and why.
- Unknowns that need user approval or runtime review.

## Done

Report the ledger and ask for approval before editing. Do not delete files during
the audit command.
