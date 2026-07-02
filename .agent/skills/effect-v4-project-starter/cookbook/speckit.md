# Initialize SpecKit

## Context

Use when the project should support SpecKit workflows for Codex, Claude Code, or both. SpecKit is optional; do not add it to tiny utility packages unless planning/spec workflows are part of the user request.

## Input

The initialized project root and desired integrations.

## Steps

### 1. Verify Specify CLI

Run:

```bash
specify version
specify init --help
```

### 2. Initialize Codex Skills

From the project root:

```bash
specify init --here --force --integration codex --integration-options="--skills" --script sh --ignore-agent-tools
```

This creates Codex-facing SpecKit skills under `.agents/skills/speckit-*`.

### 3. Initialize Claude Code Skills When Needed

Only add Claude integration when the user wants Claude Code workflows in this repo:

```bash
specify init --here --force --integration claude --script sh --ignore-agent-tools
```

This creates Claude-facing SpecKit skills under `.claude/skills/speckit-*` and merges integration metadata.

### 4. Verify Integrations

Run checks for the integrations you added:

```bash
find .agents/skills -maxdepth 2 -name SKILL.md | sort
test -f .specify/integrations/codex.manifest.json
```

If Claude was added:

```bash
find .claude/skills -maxdepth 2 -name SKILL.md | sort
test -f .specify/integrations/claude.manifest.json
```

### 5. Tailor Constitution And Agent Docs

Edit `.specify/memory/constitution.md`, `AGENTS.md`, and `CLAUDE.md` only if present or required. Describe the actual project shape:

- single package vs Bun workspace
- Effect v4 package and platform choices
- local skill ownership
- generated artifact rules
- plugin packaging rules, if applicable
- verification gates

Do not leave generic template language where a project-specific rule is known.

## Done

Report the SpecKit version, generated integrations, tailored files, and any skipped integration.
