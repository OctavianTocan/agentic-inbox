# Verify The Base

## Context

Use after creating or modifying the scaffold. Verification must prove the actual committed shape: package checks, generated artifact drift, submodule health, and plugin packaging when applicable.

## Input

The project root.

## Steps

### 1. Install Dependencies

Run:

```bash
bun install
```

If the network or package cache is blocked by sandboxing, request elevated execution instead of rewriting the project around missing dependencies.

### 2. Check Generated Artifacts First

If the project has generated skills:

```bash
bun run skill-gen:check
```

If the project has generated workflows:

```bash
bun run workflow-gen:check
```

If either fails, run the matching `generate` command, inspect the diff, then rerun `check`.

### 3. Format And Lint

Run:

```bash
bun run check
```

Fix violations rather than weakening rules.

### 4. Typecheck

Run:

```bash
bun run typecheck
```

Resolve type errors at the source. Do not use casts or non-null assertions to silence the compiler.

### 5. Test

Run:

```bash
bun run test
```

Tests should verify behavior through public interfaces and should not require real secrets or network.

### 6. Audit Unused Code

Run when the repo has Knip configured:

```bash
bun run knip
```

Do not mark real source as ignored just to pass the check.

### 7. Run Full Gate

Run:

```bash
bun run ci
```

Gate on exit code. Do not grep output to decide success.

### 8. Verify Submodules

If the project vendors source references:

```bash
git submodule status
test -d vendor/effect-smol
```

Submodules should be initialized and intentionally excluded from normal source gates.

### 9. Verify Plugin Packaging

For plugin bundles, inspect the source plugin and installed cache:

```bash
find <plugin-root>/skills -maxdepth 2 -name SKILL.md | sort
find <installed-plugin-cache>/skills -maxdepth 2 -name SKILL.md | sort
```

Do not claim a plugin skill is discoverable until the installed cache contains real `SKILL.md` files.

### 10. Inspect Git State

Run:

```bash
git status --short
```

Report all changed files. Do not commit unless the user asked.

## Done

Report exact verification commands, pass/fail state, generated artifacts updated, submodule state, plugin cache state when applicable, and remaining risk.
