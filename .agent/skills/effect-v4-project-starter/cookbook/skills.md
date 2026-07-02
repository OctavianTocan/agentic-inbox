# Copy And Adapt Local Skills

## Context

Use after scaffold and before implementation. Local skills make future agents follow the same repo conventions without re-discovering them.

## Input

The source skill bundle and target project root.

## Steps

### 1. Copy Only Applicable Skills

For an Effect v4 workspace, start from this menu:

```bash
mkdir -p <project-root>/.agents/skills
cp -R <source>/.agents/skills/domain-effect <project-root>/.agents/skills/
cp -R <source>/.agents/skills/domain-package <project-root>/.agents/skills/
cp -R <source>/.agents/skills/domain-configs <project-root>/.agents/skills/
cp -R <source>/.agents/skills/workflow-plan <project-root>/.agents/skills/
cp -R <source>/.agents/skills/meta-housekeeping <project-root>/.agents/skills/
```

Add these only when the project uses the matching generator:

```bash
cp -R <source>/.agents/skills/skill-gen <project-root>/.agents/skills/
cp -R <source>/.agents/skills/workflow-gen <project-root>/.agents/skills/
```

Do not copy stale skills that teach older package names or obsolete APIs. If a copied skill conflicts with live repo source, update the skill before relying on it.

### 2. Keep Ownership Clear

Use this ownership split:

| Skill | Owns |
| --- | --- |
| `domain-effect` | services, layers, schemas, errors, API/RPC boundaries |
| `domain-package` | package.json, tsconfig, exports, package layout |
| `domain-configs` | routing config files to their owner skills |
| `skill-gen` | generated `.agents/skills/*/SKILL.md` from source fragments |
| `workflow-gen` | generated `.github/workflows/*.yml` and `required-workflows.json` |
| `workflow-plan` | planning ambiguous work before implementation |
| `meta-housekeeping` | maintenance passes and repo-wide audits |

Do not duplicate a rule in multiple skills. Cross-reference the owner by skill name.

### 3. Remove Source-Specific References

Search copied skills for names, paths, products, or private services from the source project:

```bash
rg -n "<old-project>|comcom|workspace-only|Linear|Slack|AWS|Rivet|Telegram|AGY" <project-root>/.agents/skills
```

Replace with project-local wording or remove irrelevant sections. Keep reusable patterns, not old product constraints.

### 4. Add Project Skill README When Useful

For larger projects, create `.agents/skills/README.md` with:

- skill list and trigger conditions
- which skills are generated
- which generated files must not be hand-edited
- how to run drift checks

Skip this for small repos where `AGENTS.md` already covers it.

### 5. Keep Skills Out Of Normal Source Gates

Configure Biome/Knip so `.agents`, `.claude`, `.specify`, and `vendor` are not treated as application source unless the project intentionally validates them.

Generated skill drift should be checked by the generator, not by hand.

## Done

Report copied skills, removed source-specific references, generated-skill ownership, and any retained references that are intentionally documentary.
