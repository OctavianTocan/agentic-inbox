---
name: meta-writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Overview

For skills that change agent behavior (discipline rules, when-to-use-X-vs-Y decisions, edge-case handling), pressure-testing with subagents before and after writing is a useful sanity check. See the RED-GREEN-REFACTOR summary below and [testing-skills-with-subagents.md](testing-skills-with-subagents.md) for the full methodology. Use when warranted; not required for additive reference content (new sections that surface APIs, syntax, or recipes without changing existing rules).

**Optional reading:** `anthropic-best-practices.md` is a long opt-in reference of Anthropic's official skill-authoring guidance. Skip unless you specifically need it.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help future Claude instances find and apply effective approaches.

**Skills are:** reusable techniques, patterns, tools, reference guides.
**Skills are NOT:** narratives about how you solved a problem once.

## Skills are MECE and DRY

Two non-negotiable rules govern every skill in this repo:

**MECE (Mutually Exclusive, Collectively Exhaustive).** Every responsibility belongs to exactly one skill. When two skills could plausibly own a topic, pick the owner; the other links by name. Before claiming a responsibility in a `description:`, verify no other skill claims it. Before adding a section, check whether another skill already owns that scope.

**DRY (Don't Repeat Yourself).** A rule, paragraph, or template lives in one canonical place. Other skills cite by skill name or doc section ("see `AGENTS.md` > Conventions for boolean naming") and never restate. If you find yourself pasting from another skill, stop and link.

**How to apply:**

- Grep other skills before adding a section on a topic.
- When two skills inevitably co-author a topic (e.g. `domain-cli` extending `domain-effect`), the dependent skill explicitly cites the base and adds only deltas.
- Cross-reference by skill name. Never use `@`-links — they force-load and burn context (see CSO below).
- When you spot a duplicate while editing, fix it in the same change. Don't merge a new skill that re-states an existing rule.

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious to you.
- You'd reference this again across projects.
- Pattern applies broadly (not project-specific).

**Don't create for:**
- One-off solutions.
- Standard practices well-documented elsewhere.
- Project-specific conventions (put in `AGENTS.md`; `CLAUDE.md` is only a compatibility symlink when present).
- Mechanical constraints enforceable with regex/validation; automate those instead.

## Skill Types

- **Technique:** concrete method with steps (`condition-based-waiting`, `root-cause-tracing`).
- **Pattern:** way of thinking about problems (`flatten-with-flags`, `test-invariants`).
- **Reference:** API docs, syntax guides, tool documentation.

## Skill Taxonomy

All skills use a group prefix `{group}-{name}`:

| Group | Purpose |
|---|---|
| `workflow-` | Idea-to-merge pipeline (`workflow-plan`, `workflow-finish`). |
| `practice-` | Coding discipline & quality gates (`practice-debug`). |
| `domain-` | Project-specific patterns (`domain-effect`, `domain-cli`, ...). |
| `meta-` | System management and the skill system itself. |

The pipeline: `workflow-plan → implementation → workflow-finish` (plan covers the brainstorm phase).

**Choosing a group:** does it guide a step in the pipeline (`workflow-`)? enforce coding discipline (`practice-`)? teach project-specific patterns (`domain-`)? Otherwise `meta-`.

## Directory Structure

```
.agents/skills/
  {group}-{name}/
    SKILL.md              # Main reference (required)
    supporting-file.*     # Only if needed
    references/           # For skills over 500 lines
```

**Naming rules:** directory MUST match the `name:` frontmatter field; lowercase alphanumeric + hyphens only (max 64 chars); always include the group prefix.

**Separate files for:** heavy reference (100+ lines), reusable scripts/tools, prompt templates.
**Keep inline:** principles, concepts, code patterns under 50 lines.

## SKILL.md Structure

**Frontmatter (YAML):** the Claude Code loader recognizes only `name` (64 chars max) and `description` (1024 chars max) and ignores any extra keys. Tooling-owned keys are an allowed exception: e.g. a skill may pin a version field that a drift-check script reads. Add an extra key only when a tool reads it; otherwise stick to `name` + `description`. `name` uses letters/numbers/hyphens only. `description` is third-person, starts with "Use when...", lists triggering symptoms and contexts, and **never summarizes the workflow**.

```markdown
---
name: group-skill-name
description: Use when [specific triggering conditions and symptoms]
---

# Skill Name

## Overview
What is this? Core principle in 1-2 sentences.

## When to Use
Bullet list of symptoms and use cases. When NOT to use.

## Core Pattern (for techniques/patterns)
Before/after code comparison.

## Quick Reference
Table or bullets for scanning common operations.

## Implementation
Inline code for simple patterns; link to a file for heavy reference.

## Common Mistakes
What goes wrong + fixes.
```

## Claude Search Optimization (CSO)

Future Claude needs to FIND your skill. The description is what loads the skill into context.

**Description = When to Use, NOT What the Skill Does.** When a description summarizes a workflow, Claude follows the summary instead of reading the body. A description saying "code review between tasks" caused Claude to do ONE review even though the skill body specified TWO. Changing it to "Use when executing implementation plans with independent tasks" fixed the behavior.

```yaml
# BAD: summarizes workflow - Claude follows this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# GOOD: triggering conditions only
description: Use when implementing any feature or bugfix, before writing implementation code
```

**Keyword coverage:** use words Claude would search for: error messages ("Hook timed out"), symptoms ("flaky", "hanging"), synonyms ("timeout/hang/freeze"), tool names.

**Descriptive naming:** active voice, verb-first. `creating-skills` not `skill-creation`. `condition-based-waiting` not `async-test-helpers`. Gerunds work well for processes.

**Token efficiency:** frequently-loaded skills load into every conversation. Aim under 500 words for normal skills, under 200 for frequently-loaded ones, under 150 for getting-started workflows. Move flag details to `--help`. Cross-reference instead of repeating. Compress examples.

**Cross-referencing other skills:** use the skill name with explicit requirement markers. **Never use `@` links** (they force-load the file immediately and burn 200k+ context).

```markdown
Good: **REQUIRED BACKGROUND:** You MUST understand practice-debug
Bad:  See skills/testing/test-driven-development            (unclear if required)
Bad:  @skills/testing/test-driven-development/SKILL.md      (force-loads, burns context)
```

## Flowchart Usage

Use flowcharts ONLY for non-obvious decision points, process loops where you might stop too early, and "when to use A vs B" decisions. Never use flowcharts for reference material (use tables), code (use markdown blocks), or linear instructions (use numbered lists). Labels must carry semantic meaning; never `step1`, `helper2`.

See [graphviz-conventions.dot](graphviz-conventions.dot) for graphviz style rules. The `render-graphs.js` script in this directory is human-only tooling for previewing diagrams as SVG; agents should not invoke it.

## Code Examples

**One excellent example beats many mediocre ones.** Pick the most relevant language: testing techniques in TypeScript/JavaScript, system debugging in Shell/Python, data processing in Python.

A good example is complete and runnable, drawn from a real scenario, and ready to adapt; not a generic fill-in-the-blank template. Don't reimplement the same example in five languages. You're good at porting; one excellent example is enough.

Agents copy example style verbatim, so comments inside examples follow the `AGENTS.md` > Conventions comment rules exactly as production code does. Allowed doc apparatus on top: expected-output/type annotations (`// => 42`, `// Option<User>`), `// Wrong` / `// Right` contrast markers, and `// ...` elision placeholders. Never label steps, narrate the next line, or restate what the code, the library, or the codebase already says; teach in the prose around the snippet instead.

## Bulletproofing (Summary)

Skills that enforce discipline must resist rationalization under pressure. Apply persuasion principles deliberately:

- **Authority:** imperative, non-negotiable language ("YOU MUST", "No exceptions"). Removes decision fatigue.
- **Commitment:** force explicit choices and announcements; track via the active task-plan mechanism, such as TodoWrite in Claude Code or the plan/checklist tool in Conductor. Locks the agent into the path.
- **Social proof / scarcity:** universal framing ("Every time", "Before proceeding") establishes the norm and time-bounds compliance.

Avoid liking and reciprocity for compliance: they create sycophancy and conflict with honest feedback.

For the full mechanics (rationalization tables, red-flag lists, "spirit vs letter" counters, per-skill-type test recipes, and the complete creation checklist) see [testing-skills-with-subagents.md](testing-skills-with-subagents.md).

## Anti-Patterns

- **Narrative example:** "In session 2025-10-03, we found...". Too specific, not reusable.
- **Multi-language dilution:** parallel examples in 5 languages. Mediocre quality, maintenance burden.
- **Code in flowcharts:** `step1 [label="import fs"]`. Can't copy-paste, hard to read.
- **Generic labels:** `helper1`, `step3`. Labels must have semantic meaning.

## RED-GREEN-REFACTOR (Summary)

- **RED:** run pressure scenarios WITHOUT the skill. Document choices and verbatim rationalizations. You must see what agents naturally do before writing the skill.
- **GREEN:** write the smallest skill that addresses those specific failures. Re-run scenarios; the agent should now comply.
- **REFACTOR:** capture new rationalizations, add explicit counters, re-test until bulletproof.

Full methodology, including pressure types (time, sunk cost, authority, exhaustion), meta-testing technique, and the complete RED-GREEN-REFACTOR checklist, lives in [testing-skills-with-subagents.md](testing-skills-with-subagents.md).
