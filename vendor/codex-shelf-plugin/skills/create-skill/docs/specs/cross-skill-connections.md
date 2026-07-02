# Cross-Skill Connection Discovery

**Date**: 2026-03-24
**Status**: Approved
**Problem**: Skills created by `create-skill` are born as isolated islands with no awareness of each other.

## Solution

Add a stage-based taxonomy and connection discovery step to the skill creation workflow. At creation time, scan installed skills, find connections based on workflow stages, present them for user approval, and wire up frontmatter in both directions.

## Stage Taxonomy

Eight stages matching real development workflows:

| Stage | Description |
|-------|-------------|
| `brainstorm` | Ideation, requirements, exploration |
| `plan` | Architecture, design docs, specs |
| `build` | Implementation, coding |
| `test` | Testing, QA, validation |
| `review` | Code review, audits |
| `ship` | Deploy, release, PR creation |
| `monitor` | Post-deploy, observability |
| `debug` | Investigation, bug fixing |

Skills can belong to multiple stages.

**Adjacency is forward-only** along the linear chain:
```
brainstorm → plan → build → test → review → ship → monitor
```

`debug` links are **bidirectional** and connect to `test`, `build`, and `monitor`. Debug links are treated as same-stage connections (stored in `benefits-from`, presented under "Works with").

Canonical reference: `references/stages.md`

## Frontmatter Schema Changes

Three new optional fields:

```yaml
---
name: lint-sql
description: ...
stages: [build, review]
suggests: [qa, ship]
benefits-from: [review, eslint-config]
---
```

- **`stages`**: array of valid stage names from the taxonomy. Used for discovery.
- **`suggests`**: skills to consider after this one (directional, forward-adjacent stage). Values are the `name` field from the target skill's frontmatter.
- **`benefits-from`**: complementary skills (bidirectional — same stage or debug links). Values are the `name` field from the target skill's frontmatter.

A skill must never reference itself in `suggests` or `benefits-from`.

## Connection Discovery Flow

Inserted as **Step 3** in `cookbook/create.md`:

1. Ask the user which stage(s) the new skill belongs to (multiple choice from taxonomy).
2. Scan skill directories for installed skills.
3. Read each skill's frontmatter. Skip skills without a `stages` field.
4. Match skills using these rules:
   - **Same stage or debug link** (`↔`): skills sharing any stage with the new skill, or connected via debug adjacency.
   - **Forward-adjacent** (`→`): skills whose stage is the next stage in the linear chain from any of the new skill's stages.
   - If a skill matches on both same-stage and adjacent, show it once under same-stage (higher affinity wins).
5. If zero candidates found, print "No connection candidates found (most skills don't have stages yet)" and continue.
6. Present matches grouped by connection type:

```
Connections found for lint-sql (stages: build, review):

Works with (same stage):
  - review (stages: review) — "Pre-landing PR review"
  - eslint-config (stages: build) — "ESLint setup and enforcement"

Next steps (adjacent stage):
  - qa (stages: test) — "Systematically QA test a web application"
  - ship (stages: ship) — "Ship workflow: tests, review, PR"

Wire up these connections? (Pick by letter, comma-separated, or 'all' / 'none')
  a) lint-sql ↔ review
  b) lint-sql ↔ eslint-config
  c) lint-sql → qa
  d) lint-sql → ship
```

7. For approved connections:
   - Same stage / debug (`↔`): add to `benefits-from` on both skills.
   - Forward-adjacent (`→`): add to `suggests` on the new skill, add to `benefits-from` on the target.
   - Before writing to another skill's frontmatter, check the file is writable. If not, warn and skip.
   - Deduplicate: don't add a value that already exists.

## SKILL.md Body: Related Skills Section

**Always regenerated from frontmatter fields**, never manually edited. When connections change (via create or edit workflows), this section is rewritten.

Appended to the skill body:

```markdown
## Related Skills

**Works with:** /review, /eslint-config
**Next steps:** /qa, /ship
```

Omit a line if its list is empty. Omit the entire section if both lists are empty.

## What This Does NOT Do

- No shared preamble or ethos injection (internal structure is already good).
- No runtime stage detection (static frontmatter only).
- No LLM-based connection analysis (deterministic taxonomy matching).
- No retroactive tagging of existing skills (only new skills get wired; existing skills get updated only when they're a match and the user approves).

## Bootstrap Note

The feature grows organically. The first few skills created with `stages` won't find many connections. As more skills are tagged, the network becomes useful.
