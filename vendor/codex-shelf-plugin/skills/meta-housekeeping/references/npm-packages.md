# npm Package Updates

## Commands

| Task | Command |
|------|---------|
| Update dependencies | `bun update` (add `--latest` to cross semver ranges) |

## Dependency Audit (Knip)

For unused dependency/file auditing with knip, see [knip.md](knip.md). Quick start: `bun run knip`.

## Catalog Deduplication

The root `package.json` defines a `workspaces.catalog` that centralizes shared dependency versions. When a dependency appears in multiple workspace `package.json` files with its own inline version (not `catalog:`), consolidate it into the catalog.

**Workflow:**

1. Scan all workspace `package.json` files for dependencies that appear in 2+ packages but are **not** in `workspaces.catalog`.
2. For each duplicate:
   - Pick the highest semver-compatible version across all workspaces
   - Add it to `workspaces.catalog` in the root `package.json`
   - Replace inline versions in each workspace with `"catalog:"` (Bun catalog protocol)
3. Also migrate any workspace still pinning an inline version of a dep that **is** already in the catalog.
4. Run `bun install` to regenerate the lockfile.
5. Verify with `bun run ci`.

## Shared Tooling Config

TypeScript config belongs in `@tooling/typescript-config` (the shared tsconfig bases `base.json` and `bun.json`) rather than being duplicated per package. A package that needs a base should extend `@tooling/typescript-config/base.json` or `@tooling/typescript-config/bun.json` instead of redefining compiler options inline.

## Verification

After any dependency change:

1. Typecheck: `bun run typecheck`
2. Tests: `bun run test`
3. Full gate: `bun run ci`
