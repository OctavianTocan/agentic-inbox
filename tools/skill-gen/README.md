# skill-gen

> Co-locate agent skill fragments next to the code they describe, then generate complete `SKILL.md` files from them.

Instead of maintaining large, disconnected skill documents by hand, embed small markdown fragments in your source files using comment markers. This tool scans the repo, merges fragments that share the same skill name, and writes valid `SKILL.md` files — with a `check` command to keep generated output in sync in CI.

---

## Why

Agent skill definitions grow large and drift from the code they describe. By keeping skill knowledge next to the source it relates to, teams get:

- **Locality** — change a module and its agent guidance in the same PR
- **Composition** — multiple files contribute sections to the same skill via merge
- **Safety** — hand-written skills are never overwritten; generated files carry a clear header
- **Drift detection** — `check` fails CI when committed skills are stale

---

## Quick start

**Requirements:** [Bun](https://bun.sh) 1.x

```bash
git clone git@github.com:OctavianTocan/skill-gen.git
cd skill-gen
bun install
```

Embed a fragment in any source file:

```ts
//<skill-gen>
// ---
// name: my-skill
// description: "What this skill teaches agents."
// ---
//
// ## Section Heading
//
// Markdown body content here.
//</skill-gen>
```

Generate skills:

```bash
bun run generate
```

Verify in CI (exits 1 if output differs):

```bash
bun run check
```

---

## How it works

```
Source files with markers          Generated output
─────────────────────────          ────────────────
apps/api/src/server.ts    ──┐
apps/api/src/handlers.ts  ──┼──►  .agent/skills/api/SKILL.md
packages/shared/util.ts   ──┘
```

1. **Scan** — walk the repo for files containing `//<skill-gen>` … `//</skill-gen>` blocks
2. **Parse** — strip comment prefixes, expand template variables, extract YAML frontmatter
3. **Merge** — combine fragments sharing the same `name` (bodies concatenated)
4. **Output** — write `.agent/skills/<name>/SKILL.md` with an auto-generated header

See [SPEC.md](./SPEC.md) for merge rules, template variables, dynamic fragments, and edge cases.

---

## Fragment format

```ts
//<skill-gen>
// ---
// name: effect-patterns
// description: "Effect-TS patterns for type-safe applications."
// paths:
//   - "packages/server/**/*.ts"
// ---
//
// ## Service Pattern
//
// Always use `Effect.Service` for application services.
//</skill-gen>
```

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | yes | Merge key; determines output directory name |
| `description` | yes | Used in generated frontmatter |
| `paths` | no | Extra frontmatter preserved in output |

Comment prefixes (`//` or `#`) inside fragments are stripped automatically.

---

## Template variables

Expanded before parsing:

| Variable | Expands to |
|----------|------------|
| `$$file` | Relative path from repo root to the source file |
| `$$directory` | Relative path to the source file's directory |

Use `\$$` to produce a literal `$$file` / `$$directory` in the output.

---

## CLI

```
Usage: skill-gen <command> [options]

Commands:
  generate           Scan, merge, and write skill files (default)
  check              Dry-run: exit 1 if generated output differs from disk
  e2e-test           Run e2e tests against fixtures

Options:
  --base <path>      Base folder to scan (default: git repo root)
  --output <path>    Output folder (default: <base>/.agent/skills)
  --verbose          Print discovered fragments and merge diagnostics
  --help             Show help
```

Run directly:

```bash
bun run src/index.ts generate
bun run src/index.ts check
bun run src/index.ts e2e-test
```

---

## Multi-source merging

Fragments with the same `name` are combined:

| Field | Strategy |
|-------|----------|
| `name` | Must match (merge key) |
| `description` | Last writer wins (warns if different) |
| extra frontmatter | Later non-empty declarations win |
| body | Concatenated in source-file order (sorted by path) |

---

## Dynamic fragments

For skills generated from code rather than comment markers, register TypeScript modules in `src/dynamic-fragments.ts`:

```typescript
const DYNAMIC_FRAGMENT_MODULES = [
  'packages/my-cli/src/Skills/Fragments.ts',
] as const;
```

Each module must export `getSkillFragments()` returning `{ name, description, body }` objects. Missing modules are skipped silently.

---

## Supported file types

`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.yaml`, `.yml`, `.sh`, `.bash`, `.py`, `.rb`, `.go`, `.rs`, `.nix`, `.toml`, `.md`

---

## Development

```bash
bun install
bun run typecheck
bun run test
bun run e2e-test
bun run generate   # regenerate this repo's own skill-gen skill
```

After editing fragments in `src/index.ts`, run `generate` and commit the updated `.agent/skills/skill-gen/SKILL.md`.

---

## License

MIT
