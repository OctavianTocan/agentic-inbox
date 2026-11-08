# gen-github-workflow

> Co-locate GitHub Actions workflow fragments next to the code they relate to, then generate complete `.github/workflows/*.yml` files from them.

Instead of maintaining large, repetitive workflow YAML by hand, embed small fragments in your source files using comment markers. This tool scans the repo, merges fragments that share the same workflow name, and writes valid GitHub Actions files — with a `check` command to keep generated output in sync in CI.

---

## Why

Workflow definitions grow large and drift from the code they test. By keeping CI concerns next to the source they protect, teams get:

- **Locality** — change a service and its CI in the same PR
- **Composition** — multiple files contribute jobs to the same workflow via deep merge
- **Safety** — hand-written workflows are never overwritten; generated files carry a clear header
- **Drift detection** — `check` fails CI when committed YAML is stale

---

## Quick start

**Requirements:** [Bun](https://bun.sh) 1.x

```bash
git clone git@github.com:OctavianTocan/gen-github-workflow.git
cd gen-github-workflow
bun install
```

Embed a fragment in any source file:

```ts
//<gen-github-workflow>
// name: ci-my-service
// required: true
// on:
//   push:
//     branches: [main]
//   pull_request: {}
// permissions:
//   contents: read
// jobs:
//   build:
//     name: Build my-service
//     steps:
//       - uses: actions/checkout@v5
//       - run: bun run build
//</gen-github-workflow>
```

Generate workflows:

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
apps/api/src/routes.ts    ──┼──►  .github/workflows/ci-api.yml
packages/shared/util.ts   ──┘
```

1. **Scan** — walk the repo for files containing `//<gen-github-workflow>` … `//</gen-github-workflow>` blocks
2. **Parse** — strip comment prefixes, expand template variables, parse YAML
3. **Merge** — deep-merge fragments sharing the same `name` key
4. **Output** — write `.github/workflows/<name>.yml` with an auto-generated header

See [SPEC.md](./SPEC.md) for merge rules, template variables, and edge cases.

---

## Template variables

Expanded before YAML parsing:

| Variable | Expands to |
|----------|------------|
| `$$file` | Relative path from repo root to the source file |
| `$$directory` | Relative path to the source file's directory |

Useful for path-scoped triggers:

```ts
//<gen-github-workflow>
// name: e2e-test-api
// on:
//   pull_request:
//     paths: ["$$directory/**"]
// jobs:
//   test:
//     name: E2E test API
//     steps:
//       - uses: actions/checkout@v5
//       - run: bun test
//</gen-github-workflow>
```

---

## CLI

```
Usage: gen-github-workflow <command> [options]

Commands:
  generate           Scan, merge, and write workflow files (default)
  check              Dry-run: exit 1 if generated output differs from disk
  e2e-test           Run e2e tests against fixtures

Options:
  --base <path>      Base folder to scan (default: git repo root)
  --output <path>    Output folder (default: <base>/.github/workflows)
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

| Key | Strategy |
|-----|----------|
| `on` | Union of trigger definitions |
| `env`, `permissions` | Shallow merge, later wins |
| `concurrency` | Last writer wins |
| `jobs` | Merge by job id; `steps` arrays concatenated |

---

## Required workflows

Set `required: true` on a fragment to include its job display names in `required-workflows.json` at the repo root. Use this file to configure branch protection status checks. Required workflows must have an unfiltered `pull_request` trigger.

---

## Supported file types

`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.yaml`, `.yml`, `.sh`, `.bash`, `.py`, `.rb`, `.go`, `.rs`, `.nix`, `.toml`

Comment prefixes (`//` or `#`) inside fragments are stripped automatically.

---

## Development

```bash
bun install
bun run typecheck
bun run e2e-test
bun run generate   # regenerate this repo's own CI workflows
```

After editing workflow fragments in `src/index.ts`, run `generate` and commit the updated `.github/workflows/*.yml`.

---

## Related

- [gen-skills](https://github.com/OctavianTocan/gen-skills) — same pattern for agent skills
- [meta-writing-skills](https://github.com/OctavianTocan/meta-writing-skills) — how to author skills well

This repo includes `.agent/skills/gen-github-workflow/SKILL.md` for agents using the tool.

---

## License

MIT
