# Remove Approved Unused Surface

## Context

Use this after the user approves specific cleanup candidates from an audit.

## Input

The approved removal list, including files, exports, package entries, routes,
assets, or skill entries to delete.

## Steps

### 1. Reconfirm The Approved Set

Restate the exact items approved for removal. If the approval is ambiguous,
pause and ask. Do not expand scope while editing.

### 2. Remove In Dependency Order

Apply changes from leaves inward:

1. Remove unused imports and references.
2. Remove unused exports/barrel entries.
3. Remove files and assets.
4. Remove package dependencies only after source references are gone.
5. Remove skill manifest/index entries when deleting a skill.

Preserve unrelated user changes.

### 3. Verify

Run the narrowest useful checks first, then full gates:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

If design docs changed, also run:

```bash
bun run design:lint
```

If dependency entries changed, run:

```bash
bun install
bun run deps:check
```

### 4. Report Residual Risk

Call out any candidate not removed, any dynamic usage that could not be proven
statically, and any verification command that failed or could not run.

## Done

Tell the user what was removed, what evidence justified it, and which checks
passed.
