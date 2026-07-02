# router

> A meta-skill for AI agents that tracks skill usage, recommends the right skill for a task, and chains skills into named workflows.

---

## What It Does

`router` is a small, focused meta-skill for navigating your own skill library:

- **Tracks usage** — a `PostToolUse` hook logs every skill invocation into a local
  SQLite DB, so `router` can tell you your most-used skills.
- **Helps you pick** — given a task, it ranks candidate skills (lexical relevance +
  usage frequency + recency) and recommends a shortlist for **you** to choose from.
- **Chains workflows** — declarative `workflows/*.md` define back-to-back skill
  sequences (e.g. `brainstorming → writing-plans → executing-plans`) that the
  agent walks step by step, announcing each handoff.

`router` never auto-invokes a skill on its own — it narrows the choice and lets the
user (and the agent) decide. The hook works no matter where the skill is installed:
`install-hook` embeds the absolute path to the script at install time.

---

## Skill Architecture

Progressive disclosure: a lean `SKILL.md` routes to per-command cookbook files, which
pull in the reference and run the script on demand.

```
router/
├── SKILL.md                       # routing doc (read on trigger)
├── cookbook/
│   ├── setup.md                   # one-time: init DB + install PostToolUse hook
│   ├── stats.md                   # most-used skills
│   ├── pick.md                    # recommend a skill for a request; you choose
│   └── workflows.md               # list / run / define multi-skill workflows
├── references/
│   └── schema.md                  # DB schema, hook mechanics, workflow file format
├── scripts/
│   └── router.py                  # stdlib-only CLI (init, record, catalog, stats, rank, workflows, install-hook)
├── workflows/
│   ├── bug-fix.md                 # systematic-debugging → tdd → verification
│   ├── feature-build.md           # brainstorming → writing-plans → executing-plans → verification
│   └── ship-pr.md                 # requesting-code-review → receiving-code-review → finishing-a-development-branch
└── data/
    └── .gitkeep                   # local usage DB is created here by `init` and gitignored
```

---

## Commands

| Command                          | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `/router setup`                  | Install the usage hook + initialize the SQLite DB              |
| `/router stats`                  | List your most-used skills (all-time or a recent window)       |
| `/router pick <request>`         | Recommend the best-fit skills for a request; you choose        |
| `/router workflows`              | List defined multi-skill workflows                             |
| `/router run <workflow>`         | Walk a named workflow step by step, with handoffs              |

---

## Installation

Install with Vercel's Skills CLI (recommended):

```bash
npx skills add OctavianTocan/router
```

Or clone into your skills directory (default install location — the cookbook
instructions assume this):

```bash
git clone https://github.com/OctavianTocan/router ~/.claude/skills/router
```

Then run **`/router setup`** once to initialize the usage DB and install the
counting hook into `~/.claude/settings.json` (it backs the file up first). Usage
counting begins in new sessions started after install.

If you install to a different path, the cookbook commands show
`$HOME/.claude/skills/router/...` — substitute your path.

---

## Usage

```text
/router stats                       # your most-used skills, all-time
/router stats --days 30             # last 30 days only
/router pick fix a flaky test       # recommend a skill for a task; you choose
/router workflows                   # list declared multi-skill workflows
/router run feature-build           # walk a workflow step by step, with handoffs
/router setup                       # install the hook + init the DB (idempotent)
```

The agent reads `SKILL.md`, picks the matching cookbook file, and follows the
steps — running `scripts/router.py` (stdlib only) and walking the
`workflows/*.md` definitions when needed.

---

## How Counting Works

The hook records every skill invocation made through the `Skill` tool (this
includes `/slash` triggers) into a local SQLite DB at
`<skill-dir>/data/usage.db`. Counting starts after `setup` runs — there is no
historical backfill. Plugin skills (e.g. `superpowers:brainstorming`) are
tracked by name even though their `SKILL.md` lives in the plugin cache.

See [`references/schema.md`](references/schema.md) for the DB schema, the
ranking formula, and the workflow file format.

---

## Scope

Local usage stats and skill recommendation (v1). It does not push metrics anywhere
remote, share usage data between machines, or auto-invoke skills. The
recommendation step is a shortlist for you to choose from — the agent and the
user make the final semantic pick.

---

## License

MIT
