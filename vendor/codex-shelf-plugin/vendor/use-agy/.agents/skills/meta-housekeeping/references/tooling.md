# Tooling Housekeeping

Enforce conventions across shared tooling configuration.

## Scope

- `packages/tooling/typescript-config/` — shared tsconfig bases (only `base.json` and `bun.json`)
- Root tool configs — `package.json` (scripts + catalog), `tsconfig*.json`, the biome config, the `vitest` config, and the knip config

## Source of Truth

`AGENTS.md` conventions. `domain-configs` owns config conventions and the config-ownership split.

## What to Check

| Check | Details |
|-------|---------|
| tsconfig bases | `base.json` and `bun.json` are the only bases shipped; consumers extend them via `@tooling/typescript-config/<base>` |
| Extends correctness | Every package `tsconfig.json` extends a `@tooling/typescript-config` base rather than redefining compiler options |
| Script health | Root `package.json` scripts (`test`, `typecheck`, `ci`, `skill-gen:*`, `workflow-gen:*`) resolve to real commands |
| Catalog hygiene | Shared deps use `catalog:` — see [npm-packages.md](npm-packages.md) |
| Tool config validity | biome, vitest, and knip configs parse and reference paths that exist |

## Discovery

```bash
find packages/tooling -name "*.json" -not -path "*/node_modules/*" | sort
ls packages/tooling/typescript-config
```

## Audit Approach

Read the shared tooling configs and each package's `tsconfig.json` / `package.json`. Verify the bases are extended (not duplicated), the root scripts resolve, and shared deps use the catalog. Return findings as:

```
Config: {file} | Issues: {n}
- [{category}] {description} — {file}:{line}
  Current: `{value}`
  Should be: `{fix}`
```

Or `Config: {file} — clean` if none found.

## Cross-Cutting References

- [npm-packages.md](npm-packages.md) — catalog compliance
- [knip.md](knip.md) — unused tooling deps
