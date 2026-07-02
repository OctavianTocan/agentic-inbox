# Build Plugin Bundle

## Context

Use when the target is a Shelf/Codex plugin or another self-contained skill bundle. The key rule from Shelf: plugin installation must be verified against the installed cache. Symlinks or submodule paths are not enough unless the installer proves it packages them.

## Input

The plugin root, plugin name, source skill/package paths, and any upstream submodule repos.

## Steps

### 1. Use A Self-Contained Plugin Layout

For a Codex/Shelf plugin:

```text
.codex-plugin/
  plugin.json
skills/
  <skill-name>/
    SKILL.md
README.md
```

Keep plugin component directories at the plugin root. Do not put skills under `.codex-plugin/`.

### 2. Write Codex Plugin Manifest

Use a concise manifest:

```json
{
  "name": "<plugin-name>",
  "version": "0.1.0",
  "description": "<what the plugin bundles>",
  "author": {
    "name": "<owner>"
  },
  "skills": "./skills/",
  "interface": {
    "displayName": "<Display Name>",
    "shortDescription": "<short plugin description>",
    "longDescription": "<longer plugin description>",
    "developerName": "<owner>",
    "category": "Productivity",
    "capabilities": ["skills"],
    "defaultPrompt": "Use these skills when they match the task."
  }
}
```

### 3. Use Submodules As Source, Not Runtime Assumptions

Submodules are good for keeping upstream skill/package repos connected:

```bash
git -C <plugin-root> submodule add <repo-url-or-local-path> vendor/<source-name>
```

But plugin discovery should use copied snapshots under `skills/`:

```bash
mkdir -p <plugin-root>/skills
cp -R <plugin-root>/vendor/<source-name>/.agents/skills/<skill> <plugin-root>/skills/
```

If the copied skill references a package, either:

- copy the package snapshot into the skill as a packaging artifact, or
- make the skill point to the submodule path and verify the installed plugin cache includes it.

Default: copied snapshot for anything the plugin must expose reliably.

### 4. Keep Generated Artifacts Fresh

If upstream uses `skill-gen` or `workflow-gen`, run generation in upstream before copying:

```bash
bun run skill-gen:generate
bun run skill-gen:check
bun run workflow-gen:generate
bun run workflow-gen:check
```

Then copy generated outputs into the plugin bundle. Do not hand-edit generated `SKILL.md` files inside the plugin unless the plugin intentionally forks them.

### 5. Document Snapshot Provenance

Update plugin `README.md` with:

- copied skill name
- source path or submodule path
- why it is included
- whether it is generated
- refresh command

This is how future agents know which files are source and which are packaged copies.

### 6. Verify Installed Plugin Discovery

After installing or refreshing the plugin, inspect the installed plugin cache and confirm the skills are present as real files:

```bash
find <installed-plugin-cache>/skills -maxdepth 2 -name SKILL.md | sort
```

If URLs are produced during verification, fetch/open them before reporting them to the user.

## Done

Report plugin manifest path, copied skills, submodules, refresh commands, and installed-cache verification result.
