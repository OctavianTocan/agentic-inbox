# Inspect Existing Context

## Context

Use before creating or refreshing an Effect v4 project. The goal is to learn the live toolchain, the exact Effect v4 beta to pin, the target folder state, and the chosen project shape before writing files.

## Input

The user provides a target directory or project idea, and the desired shape (single package, workspace, or plugin repo).

## Steps

### 1. Confirm Toolchain

Run quick version checks:

```bash
bun --version
node --version
git --version
specify version   # only if SpecKit integration is wanted; missing is fine otherwise
```

Record the Bun, TypeScript, and Vitest versions you will pin. The bundled
`templates/root/package.json` and `templates/PLACEHOLDERS.md` list every token
that needs a value.

### 2. Verify The Effect v4 Pin

Effect v4 is in beta; pin an exact version, never `"latest"`. Check the registry:

```bash
bun pm view effect dist-tags --json 2>/dev/null || npm view effect dist-tags --json
bun pm view effect versions --json 2>/dev/null | tail -20 || npm view effect versions --json | tail -20
```

Use the same pin for `effect`, `@effect/platform-bun`, and `@effect/vitest`
(they ship in lockstep). If a `vendor/effect-smol` submodule is present, its
checkout is the matching source of truth.

### 3. Decide Project Shape

Choose explicitly:

| Shape | Use When |
| --- | --- |
| Single package | one executable or library, no reusable internal packages |
| Bun workspace | multiple packages, source generators, shared tooling, runtime surfaces, plugin packaging, or future reusable APIs |
| Plugin repo | the deliverable is a Codex/Shelf skill bundle or copied plugin snapshot |

Do not default to a workspace just because it feels serious. Do use one when the project will have a domain package plus CI/generator/tooling packages or runtime surfaces.

### 4. Survey The Bundled Templates

Everything you scaffold comes from this skill's `templates/`. Confirm what is available so you copy rather than hand-write:

```bash
find templates -maxdepth 2 -type d | sort
sed -n '1,60p' templates/PLACEHOLDERS.md
```

### 5. Check Name And Git Collision

Before creating the real folder:

```bash
test -e <project-name> && echo exists || echo available
```

Use kebab-case folder names and scoped package names that mirror the workspace purpose. If the target is already inside a git repo, do not nest a new repo unless the user explicitly wants one.

## Done

Report the target folder, detected versions, the exact Effect v4 pin, the chosen shape, and any missing tools before editing files.
