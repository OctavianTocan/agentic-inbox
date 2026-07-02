# Install Default Agent Skills

## Context

Use after scaffold and before implementation. The bundled `templates/skills/` carries a curated, already-genericized set of operating skills. Copying them makes future agents follow the same conventions without re-discovering them.

## Input

The target project root and which surfaces the project has (generators? CLI?).

## Steps

### 1. Copy The Base Set

```bash
mkdir -p <project-root>/.agents/skills
cp -R templates/skills/domain-effect          <project-root>/.agents/skills/
cp -R templates/skills/domain-package         <project-root>/.agents/skills/
cp -R templates/skills/domain-configs         <project-root>/.agents/skills/
cp -R templates/skills/practice-code-quality  <project-root>/.agents/skills/
cp -R templates/skills/practice-debug         <project-root>/.agents/skills/
cp -R templates/skills/meta-housekeeping      <project-root>/.agents/skills/
cp -R templates/skills/workflow-plan          <project-root>/.agents/skills/
```

Add by surface:

```bash
# CLI surface:
cp -R templates/skills/domain-cli      <project-root>/.agents/skills/
# Using git/PR conventions:
cp -R templates/skills/domain-git      <project-root>/.agents/skills/
# Source-driven generators (see generators.md):
cp -R templates/skills/skill-gen       <project-root>/.agents/skills/
cp -R templates/skills/workflow-gen    <project-root>/.agents/skills/
```

The bundled skills are already stripped of source-project identity. Their illustrative code examples (e.g. a `Notes` service, `@app/*` scopes) are generic teaching examples — leave them.

### 2. Keep Ownership Clear

| Skill | Owns |
| --- | --- |
| `domain-effect` | services, layers, schemas, errors, API/RPC boundaries |
| `domain-package` | package.json, tsconfig, exports, package layout |
| `domain-configs` | routing config files to their owner skills |
| `domain-cli` | `effect/unstable/cli` structure and examples |
| `domain-git` | commit and PR conventions |
| `practice-code-quality` | maintainability discipline |
| `practice-debug` | debugging discipline |
| `skill-gen` | generated `.agents/skills/*/SKILL.md` from source fragments |
| `workflow-gen` | generated `.github/workflows/*.yml` and `required-workflows.json` |
| `workflow-plan` | planning ambiguous work before implementation |
| `meta-housekeeping` | maintenance passes and repo-wide audits |

Do not duplicate a rule across skills. Cross-reference the owner by skill name. The project's `AGENTS.md` is the day-to-day contract; the skills own the detail.

### 3. Re-check For Stale References

The bundle is generic, but confirm nothing project-specific slipped in if you edited any skill:

```bash
rg -ni "use-agy|comcom|<old-project-name>" <project-root>/.agents/skills || echo clean
```

### 4. Keep Skills Out Of Source Gates

`biome.jsonc` and `knip.json` from the template already exclude `.agents`, `.specify`, and `vendor`. Generated skill drift is checked by `skill-gen`, not by Biome.

## Done

Report the skills copied, the generated-skill ownership, and any edits made to a copied skill.
