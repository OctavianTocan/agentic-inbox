# Create a New Skill

## Context
Scaffold a new skill with proper structure, YAML frontmatter, and cookbook-based organization.

## Input
The user provides: a name, a description of what the skill does, and optionally a target location and complexity level.

## Steps

### 1. Gather Requirements — The Grill

Do not accept a one-line description and start building. Interview the user relentlessly about the skill until you both have a shared understanding of what it does, when it triggers, what it produces, and how it handles edge cases. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

**Ask questions one at a time.** For each question, provide your recommended answer so the user can accept, modify, or reject. If a question can be answered by exploring the codebase or existing skills, explore first and propose the answer instead of asking.

The grill covers these branches (skip any the user already answered):

#### Branch 1: Identity
- **Name**: lowercase, kebab-case, max 64 characters. Examples: `diagram-kroki`, `code-review`, `deploy-lambda`.
- **Description**: what the skill does AND when to trigger it. Max 1024 characters. Must include trigger keywords so the agent discovers the skill automatically.
- **Location**: one of:
  - Personal: `~/.claude/skills/<name>/` (default)
  - Project: `.claude/skills/<name>/`
  - Global (all agents): `~/.agents/skills/<name>/`

#### Branch 2: Scope & Usage
- What concrete examples of usage look like (at least 2-3). Ask: "Give me examples of how you'd invoke this" or propose examples and ask if they fit.
- What the skill produces as output (files, messages, side effects, state changes).
- What it should NOT do — explicit scope boundaries.

#### Branch 3: Architecture
- **Complexity**: single workflow or multi-operation with cookbook. If the user is unsure, ask what commands or operations the skill will support. More than one operation means cookbook.
- Whether it needs scripts, references, assets, or is pure SKILL.md.
- Whether it wraps external tools (CLI agents, APIs, shell commands).
- Error handling: what happens when things fail.
- **Distribution**: every skill is published as its OWN standalone repo on GITHUB_OWNER's account — this is automatic and happens every time, so there is nothing to decide here. Just confirm the GitHub owner (defaults to the authenticated `gh` account) and that visibility is `public` (REPO_VISIBILITY). See step "Package as a Standalone Repo" and `cookbook/publish-repo.md`.

#### Branch 4: Integration
- Does it compose with other skills? Which ones?
- Does it need access to specific tools (web_search, Notion, Todoist, exec, etc.)?
- Should it log output somewhere (daily notes, task manager, etc.)?

**Stop grilling when:** you can write the SKILL.md frontmatter and a 3-sentence overview without guessing. If you're still unsure about any branch, keep asking.

**If the user says "you decide" or "I don't want to think about this":** make all decisions yourself, state them clearly, and proceed. The grill adapts to energy level — but always state what you decided so the user can veto.

### 2. Analyze Structure Needs

Based on the description and complexity, determine the directory layout:

- **Multi-command skill** (more than one operation): create `cookbook/` with one `.md` per command.
- **Runs shell operations**: create a `scripts/` directory (see guidance below).
- **Needs reference documentation** (API specs, schemas, style guides): create `references/`.
- **Needs templates or static assets** (config templates, boilerplate files): create `assets/`.
- **Simple single-workflow**: just `SKILL.md` with inline instructions, no subdirectories.

#### Vercel `npx skills` compatibility

Default to making the skill installable by Vercel's Skills CLI (`https://github.com/vercel-labs/skills`) unless the user says it is private/local-only:

- Put a valid `SKILL.md` at the **root** of the skill directory; keep frontmatter valid YAML with `name` and `description`.
- Keep `name` lowercase kebab-case so `--skill <name>` works cleanly.
- Reference all cookbook/scripts/references/assets with **relative** links, kept inside the skill directory.
- Do not rely on absolute local paths, and do not symlink to files outside the skill directory in a publishable skill.
- Make bundled scripts executable (`chmod +x`).
- Verify discovery with `npx skills add <skill_dir> --list` after creation (see the verification step below).

#### When to create `scripts/`

If the skill's cookbook files contain bash snippets that the agent will run, extract them into executable shell scripts under `scripts/`. This matters because:

1. **The agent interprets inline bash every time.** A script runs directly — fewer tokens consumed, fewer chances for the agent to mistype a command.
2. **Repeated operations compound.** If the same command appears in 2+ cookbook files, it must be a script.
3. **Complex pipelines are error-prone in markdown.** Multi-step operations (GraphQL queries with pagination, worktree setup, etc.) should be scripts.

**What belongs in `scripts/`:**
- Operations the agent runs more than once across different cookbook steps
- Multi-line bash that combines detection, API calls, or data processing
- Commands with complex jq/sed/awk pipelines
- Setup/teardown procedures (worktrees, temp dirs, dependencies)

**What stays inline in cookbook:**
- One-off commands specific to a single step
- Simple single-line commands that are self-explanatory
- Commands whose arguments change significantly per invocation

**Script conventions:**
- `#!/usr/bin/env bash` shebang, `set -euo pipefail`
- Clear usage comment at the top with argument descriptions
- No hardcoded paths — accept directories/repos as arguments, detect context from git/lockfiles
- Output structured data (JSON, one-value-per-line) so the agent can parse results
- Exit code 0 on success, 1 on failure with error on stderr
- Make scripts executable (`chmod +x`)

### 3. Discover Connections

Before generating files, tag the new skill with workflow stages and find related skills.

1. Ask the user which stage(s) the new skill belongs to (multiple choice from the taxonomy in `references/stages.md`).
2. Scan the skills directories for installed skills.
3. Read each skill's frontmatter. Skip skills without a `stages` field.
4. Match skills using these rules:
   - **Same stage** (`↔`): skills sharing any stage with the new skill.
   - **Forward-adjacent** (`→`): skills in the next linear stage.
   - **Debug links** (`↔`): bidirectional connections to/from `debug`.
5. If zero candidates found, skip to step 4 and continue.
6. Present matches grouped by connection type and ask which to wire up.

For approved connections:
- Same stage / debug (`↔`): add to `benefits-from` on both skills.
- Forward-adjacent (`→`): add to `suggests` on the new skill, add to `benefits-from` on the target.
- Deduplicate: don't add a value already present.

### 4. Choose the Correct Home

Default to `~/.claude/skills/` for personal skills.

For global multi-agent skills, place in `~/.agents/skills/` instead.

### 5. Create Directory Structure

For a cookbook-based skill:
```
<location>/<name>/
├── SKILL.md          # Lean routing doc (<3k words)
└── cookbook/         # Detailed procedures
    ├── <operation1>.md
    ├── <operation2>.md
    └── ...
```

For a skill with additional resources:
```
<location>/<name>/
├── SKILL.md
├── cookbook/
│   └── ...
├── scripts/          # If needed
│   └── ...
├── references/       # If needed
│   └── ...
└── assets/           # If needed
    └── ...
```

For a simple skill:
```
<location>/<name>/
└── SKILL.md          # Complete instructions inline
```

Create the directories:
```bash
mkdir -p <location>/<name>/cookbook  # or just <location>/<name>/ for simple skills
```

Keep the skill directory self-contained (relative links only, no symlinks pointing outside it) so it can be installed from a local path, a GitHub repo root, or a GitHub tree URL. For a shareable skill, scaffold it as its own repo — see step "Package as a Standalone Repo" and [cookbook/publish-repo.md](publish-repo.md).

### 6. Generate SKILL.md

**For cookbook-based skills**, follow this template:

```markdown
---
name: <name>
description: <description with trigger keywords>
stages: [<stage1>, <stage2>]
suggests: [<forward-adjacent skills>]
benefits-from: [<same-stage skills>]
---

# <Title>

<One or two sentence overview of what the skill does.>

## Variables

- **VAR_NAME**: `default_value`

## How It Works

<Brief summary of the skill's approach. 2-3 sentences max.>

## Commands

| Command              | Purpose                        |
| -------------------- | ------------------------------ |
| `/<name> <cmd1>`     | <what cmd1 does>               |
| `/<name> <cmd2>`     | <what cmd2 does>               |

## Cookbook

Each command has a detailed step-by-step guide. **Read the relevant cookbook file before executing a command.**

| Command | Cookbook                                | Use When                          |
| ------- | -------------------------------------- | --------------------------------- |
| cmd1    | [cookbook/cmd1.md](cookbook/cmd1.md)    | <when to use cmd1>                |
| cmd2    | [cookbook/cmd2.md](cookbook/cmd2.md)    | <when to use cmd2>                |

**When a user invokes a `/<name>` command, read the matching cookbook file first, then execute the steps.**

## Related Skills

**Works with:** /<skill1>, /<skill2>
**Next steps:** /<skill3>
```

**For simple skills**, follow this template:

```markdown
---
name: <name>
description: <description with trigger keywords>
stages: [<stage>]
---

# <Title>

<One or two sentence overview.>

## When to Use

<Trigger conditions and keywords.>

## Variables

- **VAR_NAME**: `default_value`

## Instructions

<Step-by-step instructions in imperative language. Number each step.>

1. <First step>
2. <Second step>
3. <Third step>

## Examples

<Concrete usage examples with expected input/output.>
```

Write the SKILL.md file. Mark any sections that need user input with `TODO:` comments.

### 7. Generate Cookbook Files

For each operation the skill supports, create a cookbook file at `cookbook/<operation>.md`:

```markdown
# <Operation Title>

## Context
<When to use this operation. One or two sentences.>

## Input
<What the user provides: parameters, options, context.>

## Steps

### 1. <First Step Title>
<Detailed instructions. Use imperative language.>
<Include concrete bash commands and code examples.>

### 2. <Second Step Title>
<Next set of instructions.>

### 3. <Continue as needed>

## Done
<What to report to the user when this operation completes.>
Tell the user:
- <Summary of what was done>
- <Any follow-up actions>
```

Write each cookbook file. Mark sections needing user input with `TODO:`.

### 8. Verify Vercel Skills Installability

Run:

```bash
npx skills add <location>/<name> --list
```

The output must list the new skill name. If it does not, fix frontmatter, path layout, or invalid files before continuing.

If the skill bundles cookbook files, scripts, references, or assets, optionally smoke-test a copied install from a temp dir:

```bash
tmp_dir=$(mktemp -d)
cd "$tmp_dir"
npx skills add <location>/<name> --agent codex --copy -y
test -f .agents/skills/<name>/SKILL.md
```

If scripts must be executable after install, verify their executable bit in `.agents/skills/<name>/scripts/`.

### 9. Package as a Standalone Repo — and Publish It (Always)

Every skill gets its OWN repo on GITHUB_OWNER's account, every time — this step is mandatory, not optional. Give it the standard layout (`SKILL.md` + `README.md` + `LICENSE` + `CHANGELOG.md` + `.gitignore` + `cookbook/`…), matching the other published skills, then create the GitHub remote under GITHUB_OWNER and clean it up on GitHub. Follow [cookbook/publish-repo.md](publish-repo.md) end to end, including the "Create the GitHub remote" and "Clean it up on GitHub" steps. The user has standing authorization to publish skill repos to their own account, so do NOT pause to ask before creating the remote.

### 10. Create Symlinks for Global Skills

If the skill was created in `~/.agents/skills/<name>/`:

1. Detect installed platforms:
   ```bash
   for dir in ~/.claude ~/.cursor ~/.codex ~/.cline; do
     [ -d "$dir" ] && echo "$(basename $dir): installed"
   done
   ```

2. For each detected platform with a `skills/` directory, create a symlink:
   ```bash
   mkdir -p ~/<platform>/skills
   ln -sfn ../../.agents/skills/<name> ~/<platform>/skills/<name>
   ```

3. Report which platforms were linked.

### 11. Done

Tell the user:
- Skill created at `<location>/<name>/`
- Files generated: list all files created
- `npx skills add <location>/<name> --list` discovery result (and the copied-install smoke test result if run)
- The published repo: the `GITHUB_OWNER/<name>` URL, its file tree, that it is `public` with a description set and a clean working tree, and the public `npx skills add <owner>/<repo>` install command (verified to resolve)
- If cookbook-based: remind them to populate any `TODO:` sections in cookbook files
- If connections wired: list linked skills
- If global with symlinks: list linked platforms
- Suggest testing with `/<name>` or `/<name> <command>`
