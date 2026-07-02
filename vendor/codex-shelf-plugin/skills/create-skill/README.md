# create-skill

> A skill for AI agents that scaffolds new skills — using a structured interview, cookbook-based architecture, and cross-skill connection discovery.

---

## What It Does

`create-skill` is a meta-skill: it builds other skills. Give it a name and a rough idea, and it interviews you until both of you understand exactly what needs to be built, then generates the full directory structure.

**Key behaviors:**

- **The Grill** — relentless one-question-at-a-time interview before any files are written. Each question comes with a recommended answer you can accept, modify, or reject.
- **Cookbook architecture** — lean `SKILL.md` routing document + detailed `cookbook/` files per operation. Context windows stay small; complex workflows stay clean.
- **Stage taxonomy** — tag each skill with workflow stages (`build`, `review`, `test`, etc.) to enable automatic cross-skill connection discovery.
- **Connection wiring** — scans your installed skills, finds related ones by stage adjacency, and asks which to wire up in frontmatter.
- **Auto-publish** — every skill is published as its own standalone, `npx skills`-installable repo on your GitHub account, every time, then cleaned up on GitHub (clean tree, description set, only intended files tracked, install verified). No separate "publish" decision.
- **Validation** — checks structure, frontmatter, routing table consistency, TODO markers, and script permissions.

---

## Skill Architecture Overview

Skills follow **progressive disclosure**:

```
frontmatter (always loaded)
  └── SKILL.md body (loaded on trigger match)
        └── cookbook/*.md (loaded on command invocation)
              └── scripts/, references/, assets/ (on demand)
```

This keeps context windows small by default. The agent only loads what the current operation needs.

### Directory Layout

**Cookbook-based skill (multi-operation):**

```
<name>/
├── SKILL.md           # Lean routing doc (<3k words)
├── cookbook/
│   ├── create.md
│   ├── validate.md
│   └── edit.md
├── references/        # Optional: API specs, style guides, schemas
├── scripts/           # Optional: reusable shell scripts
└── assets/            # Optional: templates, boilerplate files
```

**Simple skill (single workflow):**

```
<name>/
└── SKILL.md           # Complete instructions inline
```

---

## Commands

| Command | Purpose |
|---|---|
| `/create-skill <name> <desc>` | Scaffold a new skill (triggers the Grill interview) |
| `/create-skill --project` | Create skill in `.claude/skills/` (project scope) |
| `/create-skill --global` | Create skill in `~/.agents/skills/` (all agents) |
| `/create-skill validate <name>` | Check an existing skill for structural issues |
| `/create-skill edit <name>` | Modify an existing skill |

---

## Installation

### Claude Code / claude.ai Projects

Install with Vercel's Skills CLI (recommended):

```bash
npx skills add OctavianTocan/create-skill
```

Or copy the `create-skill/` directory into your skills folder:

```bash
# Personal (default)
cp -r create-skill ~/.claude/skills/

# Project-scoped
cp -r create-skill .claude/skills/

# Global (available to all agents)
cp -r create-skill ~/.agents/skills/
```

Claude automatically discovers skills in these locations. The `description` field in `SKILL.md` frontmatter controls when the skill is triggered.

### Other AI Agents

Any agent that supports markdown-based skill loading can use this skill. Place the directory where your agent looks for skills and ensure it reads YAML frontmatter.

---

## Skill Frontmatter Reference

Every skill needs at minimum:

```yaml
---
name: my-skill
description: What it does and when to trigger it. Include keywords like "create X", "scaffold X", "make X". Max 1024 chars.
---
```

Optional fields for cross-skill connections:

```yaml
---
name: my-skill
description: ...
stages: [build, review]          # Workflow stages this skill belongs to
suggests: [qa-skill, ship-skill] # Skills to run after this one
benefits-from: [lint-skill]      # Complementary skills at the same stage
---
```

Valid stage values: `brainstorm`, `plan`, `build`, `test`, `review`, `ship`, `monitor`, `debug`

See `references/stages.md` for the full taxonomy and adjacency rules.

---

## Workflow Stage Taxonomy

Skills are tagged with stages that map to a development workflow:

```
brainstorm → plan → build → test → review → ship → monitor
```

`debug` connects bidirectionally to `build`, `test`, and `monitor`.

When you create a new skill, `create-skill` scans your installed skills, finds ones at the same stage or adjacent stages, and asks which connections to wire. This builds a graph over time — each new skill gets placed on the map.

---

## Cookbook File Template

Each operation gets its own file in `cookbook/`:

```markdown
# Operation Title

## Context
When to use this operation. One or two sentences.

## Input
What the user provides: parameters, options, context.

## Steps

### 1. First Step
Detailed instructions. Imperative language.

### 2. Second Step
Continue...

## Done
What to report when the operation completes.
```

---

## Validation

Run `/create-skill validate <name>` to check any skill:

- Frontmatter has required fields
- Description is under 1024 characters
- Cookbook routing table matches files on disk
- No unresolved `TODO:` markers
- Scripts are executable
- No files over 50KB
- Stage names are valid
- Cross-skill references point to existing skills

---

## Design Principles

1. **SKILL.md is a routing document, not a manual.** Keep it under 3k words.
2. **Cookbook files contain the procedures.** One file per operation.
3. **Progressive disclosure.** Only load what the current operation needs.
4. **Imperative language.** Instructions tell the agent exactly what to do.
5. **Trigger keywords in description.** The agent discovers skills by scanning descriptions.
6. **Stage tags enable discovery.** Tagging builds a graph; the graph makes skills findable.

---

## Contributing

Issues and PRs welcome. The skill is intentionally agent-agnostic — if something is Claude-Code-specific when it doesn't need to be, that's worth fixing.

---

## License

MIT
