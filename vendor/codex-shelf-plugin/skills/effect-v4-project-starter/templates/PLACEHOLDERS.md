# Template placeholders

Every file under `templates/` uses `{{DOUBLE_BRACE}}` tokens for values the
scaffolding agent fills in. Replace them after copying a template into the
target project. The set is intentionally small.

| Token | Meaning | Example |
| --- | --- | --- |
| `{{REPO_NAME}}` | Workspace / repo folder name (kebab-case) | `acme-tools` |
| `{{SCOPE}}` | npm scope without the `@`. Used in package names (`@{{SCOPE}}/<pkg>`) and Effect service identifiers (`@{{SCOPE}}/<pkg>/<Module>`) | `acme-tools` |
| `{{PACKAGE}}` | The core domain package name | `effect` or `core` |
| `{{DESCRIPTION}}` | One-line project description | `Local agent tooling` |
| `{{LICENSE_HOLDER}}` | Copyright holder for `LICENSE` / README | `Ada Lovelace` |
| `{{EFFECT_VERSION}}` | Exact Effect v4 beta, verified from the npm registry | `4.0.0-beta.85` |
| `{{BUN_VERSION}}` | Installed Bun version | `1.3.14` |
| `{{BUN_TYPES_VERSION}}` | `@types/bun` version (compatible major.minor) | `1.3.12` |
| `{{TS_VERSION}}` | TypeScript version | `5.9.3` |
| `{{VITEST_VERSION}}` | Vitest version | `4.1.9` |
| `{{BIOME_VERSION}}` | `@biomejs/biome` version | `2.5.0` |
| `{{KNIP_VERSION}}` | Knip version | `6.17.1` |

Notes:
- `{{package}}` inside `templates/root/Justfile` is **Just** recipe syntax, not a
  placeholder — leave it alone.
- The example module/service is named `Greeter`. When scaffolding a real module,
  rename `Greeter` to the domain name and update its `@{{SCOPE}}/{{PACKAGE}}/Greeter`
  identifier accordingly.
- After substitution, `rg '\{\{[A-Z_]+\}\}'` over the new project should return
  nothing (a clean scaffold leaves no unfilled tokens).
