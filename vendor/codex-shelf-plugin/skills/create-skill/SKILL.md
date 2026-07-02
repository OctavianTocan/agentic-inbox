---
name: create-skill
description: "Create new AI agent skills with proper structure, YAML frontmatter, and cookbook-based organization. Uses a grill-me style interview to understand requirements before building \u2014 walks the design tree one question at a time, resolving each branch. Use when the user wants to create a skill, make a new skill, scaffold a skill, or mentions \"new skill\", \"create skill\", \"make skill\", \"skill template\". Triggers on skill creation requests."
metadata:
  tavi_toolbelt_original_frontmatter:
    stages:
    - brainstorm
    - plan
    - build
---

# Create Skill

Creates skills following the cookbook-based format: a lean SKILL.md as a routing document plus detailed `cookbook/` files for each operation. Step 1 is always the Grill — a relentless one-question-at-a-time interview (like `/grill-me`) that walks the design tree until there's shared understanding. Each question includes a recommended answer the user can accept, modify, or reject.

## Variables

- **DEFAULT_SKILL_DIR**: `~/.claude/skills/`
- **SHARED_AGENT_SKILL_DIR**: `~/.agents/skills/`
- **GITHUB_OWNER**: the GitHub account every skill repo is published under. Defaults to the authenticated `gh` account (`gh api user --jq .login`; currently `OctavianTocan`).
- **REPO_VISIBILITY**: `public` — matches the existing skill repos under GITHUB_OWNER.

## How It Works

Skills use progressive disclosure. Metadata (frontmatter) is always loaded by the agent. The SKILL.md body is read when a trigger matches. Cookbook files are read on demand when a specific command is invoked. This keeps context windows small while supporting complex multi-step workflows.

## Commands

| Command                          | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `/create-skill <name> <desc>`    | Create a new skill with the given name       |
| `/create-skill --project`        | Create a skill in `.claude/skills/` (project scope) |
| `/create-skill --global`         | Create a skill in `~/.agents/skills/` (all agents) |
| `/create-skill validate <name>`  | Validate an existing skill's structure       |
| `/create-skill edit <name>`      | Edit or update an existing skill             |

**Every skill created with `create-skill` is published as its own standalone, `npx skills`-installable repo on GITHUB_OWNER's account — every time, as the final step of `create`. See [cookbook/publish-repo.md](cookbook/publish-repo.md).**

## Decision Tree

Before creating, determine what the skill needs:

- Should multiple AI agents have access to it? → Create it in `~/.agents/skills/`
- Does the skill have multiple operations/commands? → Create a `cookbook/` directory with one `.md` per operation
- Does the skill run shell operations? → Create a `scripts/` directory with executable helpers (see `cookbook/create.md` for detailed guidance)
- Does the skill need reference documentation? → Create a `references/` directory
- Does the skill need templates or assets? → Create an `assets/` directory
- Simple single-workflow skill? → Just `SKILL.md` with inline instructions

Regardless of the layout above, **every skill is published as its own standalone, `npx skills`-installable Git repo on GITHUB_OWNER's account** — this is not optional and runs every time (see [cookbook/publish-repo.md](cookbook/publish-repo.md)).

## Cookbook

Each command has a detailed step-by-step guide. **Read the relevant cookbook file before executing a command.**

| Command  | Cookbook                                      | Use When                                                    |
| -------- | --------------------------------------------- | ----------------------------------------------------------- |
| create   | [cookbook/create.md](cookbook/create.md)      | User wants to create a new skill from scratch               |
| validate | [cookbook/validate.md](cookbook/validate.md)  | User wants to check if a skill is well-formed               |
| edit     | [cookbook/edit.md](cookbook/edit.md)          | User wants to modify an existing skill                      |
| publish-repo | [cookbook/publish-repo.md](cookbook/publish-repo.md) | Always — final step of `create`; publishes the skill as its own repo on GITHUB_OWNER's account and cleans it up there |

**When a user invokes a `/create-skill` command, read the matching cookbook file first, then execute the steps.**

## Key Principles

1. SKILL.md should be lean (<3k words) — it is a routing document, not a manual.
2. Cookbook files contain the detailed step-by-step procedures.
3. One cookbook file per operation or concern.
4. Use imperative language in all instructions.
5. Progressive disclosure: metadata → SKILL.md → cookbook → resources.
6. The `description` field MUST include trigger keywords so the agent discovers the skill.
7. Frontmatter must have `name` and `description` at minimum.
8. Include a `stages` field in frontmatter to enable cross-skill discovery.
9. Keep every skill `npx skills`-installable: a valid root `SKILL.md`, relative links only, no symlinks or absolute paths leaking outside the skill dir. Verify with `npx skills add <skill_dir> --list`.
10. Every skill gets its OWN repo on GITHUB_OWNER's account, every time, with the standard layout (`SKILL.md` + `README.md` + `LICENSE` + `CHANGELOG.md` + `.gitignore` + `cookbook/`…), matching the other published skills. This is the mandatory final step of `create` — not opt-in. See [cookbook/publish-repo.md](cookbook/publish-repo.md).
11. After pushing, leave the repo clean on GitHub: a clean working tree, a set repo description, only intended files tracked (no cruft, no leftover `TODO:` markers), and a verified public install. The "clean it up on GitHub" step in [cookbook/publish-repo.md](cookbook/publish-repo.md) is required.

## Related Skills

**Works with:** /grill-me, /validate, /library
