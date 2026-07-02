# Shelf

Shelf is a private Codex plugin bundle for the skills that should always be easy to reach.

It is intentionally boring in the places that matter: bundled skills are real entries under `skills/`, and copied snapshots remain the default when cache reliability matters. `agy-review` is the intentional exception: it is a symlink into the vendored `use-agy` submodule so the review skill stays owned by use-agy.

## What Is In The Box

- `effect-v4-project-starter`: Bun + TypeScript + Effect v4 project starter. Self-contained — it carries its own bundled `templates/` payload (configs, an example package, CLI/HTTP/RPC runtime, the `skill-gen`/`workflow-gen` generators, and default agent skills) and is hand-maintained, **not** refreshed from `use-agy`.
- `domain-effect`, `domain-package`, `domain-configs`: Effect and package conventions for serious TypeScript work.
- `skill-gen`, `workflow-gen`: source-driven generated skills and generated GitHub Actions.
- `workflow-plan`, `meta-housekeeping`: planning and maintenance workflows.
- `use-agy`, `agy-review`: generated AGY toolkit guidance plus adversarial review
  routed through the shared `use-agy` CLI/package surface.
- A curated set of high-use local skills such as `router`, `rainstorming`, `dev-box`, `recon`, `test-user-flows`, and `writing-plans`.

## Plugin Layout

```text
.codex-plugin/
  plugin.json
skills/
  <skill>/
    SKILL.md
vendor/
  use-agy/   # upstream project reference, tracked as a Git submodule
README.md
LICENSE
```

The plugin manifest points Codex at `./skills/`.

Codex plugin installation discovers skills from the manifest's `skills` path.
It does not automatically expose skills that live only inside `vendor/use-agy`.
For a vendored skill to be visible as `Shelf:<skill>`, copy its directory into
`skills/` or add a real symlink under `skills/` before reinstalling. Copied
snapshots are preferred because they survive plugin cache installation reliably.
`skills/agy-review` is deliberately symlinked to
`vendor/use-agy/.agents/skills/agy-review`; reinstall the plugin and verify the
installed cache whenever this symlink target changes.
If plugin installation omits that symlink, run:

```bash
scripts/link-installed-skill-symlinks.sh
```

## Snapshot Policy

Shelf is a bundle, not the upstream source for every skill.

- Skills are copied snapshots unless explicitly documented as symlinked.
- Generated skills are copied after their source generator has run.
- Do not hand-edit generated snapshots unless Shelf is intentionally forking that skill.
- Reinstalling or refreshing the plugin may replace the installed cache from this repo.

This keeps the installed plugin cache predictable and avoids the old failure mode where symlinked skills were missing after install.

## Refreshing From `use-agy`

Several domain skills come from the `use-agy` project. Refresh them from a checked-out `use-agy` repo:

> `effect-v4-project-starter` is **not** in this list. It is self-contained: its `templates/` payload is genericized and maintained by hand, not synced from `use-agy`. Edit it in place under `skills/effect-v4-project-starter/`.

```bash
rsync -a ../use-agy/.agents/skills/domain-effect/ skills/domain-effect/
rsync -a ../use-agy/.agents/skills/domain-package/ skills/domain-package/
rsync -a ../use-agy/.agents/skills/domain-configs/ skills/domain-configs/
rsync -a ../use-agy/.agents/skills/skill-gen/ skills/skill-gen/
rsync -a ../use-agy/.agents/skills/workflow-gen/ skills/workflow-gen/
rsync -a ../use-agy/.agents/skills/workflow-plan/ skills/workflow-plan/
rsync -a ../use-agy/.agents/skills/meta-housekeeping/ skills/meta-housekeeping/
```

This repo tracks `use-agy` as `vendor/use-agy`, so the submodule path is the preferred source when it is initialized:

```bash
rsync -a vendor/use-agy/.agents/skills/domain-effect/ skills/domain-effect/
rsync -a vendor/use-agy/.agents/skills/domain-package/ skills/domain-package/
rsync -a vendor/use-agy/.agents/skills/domain-configs/ skills/domain-configs/
rsync -a vendor/use-agy/.agents/skills/skill-gen/ skills/skill-gen/
rsync -a vendor/use-agy/.agents/skills/workflow-gen/ skills/workflow-gen/
rsync -a vendor/use-agy/.agents/skills/workflow-plan/ skills/workflow-plan/
rsync -a vendor/use-agy/.agents/skills/meta-housekeeping/ skills/meta-housekeeping/
rsync -a vendor/use-agy/.agents/skills/use-agy/ skills/use-agy/
```

`agy-review` should not be refreshed with `rsync`; keep it as:

```bash
ln -s ../vendor/use-agy/.agents/skills/agy-review skills/agy-review
```

## Verifying

From the repo root:

```bash
jq . .codex-plugin/plugin.json >/dev/null
find skills -maxdepth 2 -name SKILL.md | sort
```

After installing the plugin, also verify the installed cache contains real skill files:

```bash
find ~/.codex/plugins/cache -path '*/shelf/*/skills/*/SKILL.md' | sort
```

If `skills/agy-review` is missing after `codex plugin add shelf@plugins-cli`,
run the symlink repair helper and re-check:

```bash
scripts/link-installed-skill-symlinks.sh
test -f ~/.codex/plugins/cache/plugins-cli/shelf/0.1.0+codex.20260621233340/skills/agy-review/SKILL.md
```

## Repository Metadata

Recommended private GitHub metadata:

- Description: `Curated Codex plugin bundle of high-use skills, shipped as copied snapshots for reliable plugin cache behavior.`
- Topics: `codex`, `codex-plugin`, `codex-skills`, `agentic-workflows`, `effect`, `bun`, `typescript`, `workflow`, `tooling`
- Visibility: private

## License

MIT.
