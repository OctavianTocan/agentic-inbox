---
name: router
description: Route between installed Codex skills and chain them into back-to-back workflows. Use when the user asks which skill to use, wants to pick or compare skills, asks for most-used skill stats, says route this, asks what skill should I use, asks to run a named workflow, or wants a multi-skill sequence like brainstorming to writing-plans to executing-plans.
metadata:
  tavi_toolbelt_original_frontmatter:
    argument-hint: stats [--days N] | pick <request> | run <workflow> | workflows | setup
---

# router

A meta-skill that helps you navigate your own skill library. It tracks which
skills you actually invoke (via a `PostToolUse` hook into a local SQLite DB),
ranks candidate skills for a request, and chains skills into named, declarative
workflows the way superpowers chains brainstorming → planning → execution.

## Variables

- **DB_PATH**: `<skill-dir>/data/usage.db` by default — the script resolves its
  own install location via `__file__`, so the DB lives wherever the skill is
  installed. Override with the `ROUTER_DB` env var.
- **CLI**: `python3 <skill-dir>/scripts/router.py <subcommand>` (stdlib only)
- **WORKFLOWS_DIR**: `<skill-dir>/workflows/` — resolved at runtime; one
  `*.md` per workflow.
- **HOOK_SETTINGS**: `$HOME/.claude/settings.json` by default; override with
  `--settings` on `install-hook`.

The default install location is `$HOME/.claude/skills/router/` (see README).
If you install elsewhere, swap that path into the commands above.

## How It Works

A `PostToolUse` hook on the `Skill` tool logs every skill invocation (name, args,
session, timestamp) into SQLite. `stats` aggregates that log; `pick` blends
lexical relevance + usage frequency + recency into a shortlist that you choose
from; workflows are declarative markdown files the agent walks step by step,
announcing each handoff.

`install-hook` embeds the **absolute path** to the script at install time, so
the hook works no matter where the skill is installed.

## Arguments

Invoke as **`/router <command> [arguments]`**. Parse the text after `/router`:
the first whitespace-delimited token is the **command**; everything after it is
that command's **arguments** (free text and/or `--flags`). `--flags` pass
straight through to the CLI.

| Invocation                              | Command   | Arguments                                  |
| --------------------------------------- | --------- | ------------------------------------------ |
| `/router stats [--days N] [--limit N]`  | stats     | optional window + cap                       |
| `/router pick <request>`                | pick      | free-text task description (**required**)   |
| `/router run <workflow>`                | run       | a workflow `name` from `/router workflows`  |
| `/router workflows`                     | workflows | none                                        |
| `/router setup`                         | setup     | none                                        |

**Defaults & aliases** (apply before dispatching):

- No command but free text follows (e.g. `/router fix a flaky test`) → treat the
  whole thing as `pick <that text>`.
- No command and no text → show this Arguments table and stop.
- Aliases: `top` / `most-used` / `usage` → `stats`; `recommend` / `choose` /
  `which` → `pick`; `list` → `workflows`.
- Unrecognized command → show the table and ask which they meant; do not guess.

Once the command and arguments are parsed, **read the matching cookbook file,
then execute it with those arguments.**

## Commands

| Command                          | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `/router setup`                  | Install the usage hook + initialize the SQLite DB              |
| `/router stats`                  | List your most-used skills (all-time or a recent window)       |
| `/router pick <request>`         | Recommend the best-fit skills for a request; you choose        |
| `/router workflows`              | List defined multi-skill workflows                             |
| `/router run <workflow>`         | Walk a named workflow step by step, with handoffs              |

## Cookbook

Each command has a detailed step-by-step guide. **Read the relevant cookbook file before executing a command.**

| Command   | Cookbook                                       | Use When                                                       |
| --------- | ---------------------------------------------- | -------------------------------------------------------------- |
| setup     | [cookbook/setup.md](cookbook/setup.md)         | First-time install, or the hook/DB is missing or broken        |
| stats     | [cookbook/stats.md](cookbook/stats.md)         | User wants most-used / top skills or usage numbers             |
| pick      | [cookbook/pick.md](cookbook/pick.md)           | User wants to choose a skill for a task, or "what should I use" |
| workflows | [cookbook/workflows.md](cookbook/workflows.md) | User wants to list, run, or define a back-to-back workflow     |

**When a user invokes a `/router` command, read the matching cookbook file first, then execute the steps.**

## Reference

- [references/schema.md](references/schema.md) — DB schema, hook mechanics, and the workflow file format.

## Notes

- The hook records skills invoked through the `Skill` tool in the main session,
  which includes skills you trigger with `/slash` (the agent routes those through
  the `Skill` tool). Counting starts when `setup` runs — there is no backfill.
- Plugin skills (e.g. `superpowers:brainstorming`) are tracked by name even though
  their `SKILL.md` lives in the plugin cache rather than the scanned catalog roots;
  combine the file catalog with the live in-context skill list when picking.
