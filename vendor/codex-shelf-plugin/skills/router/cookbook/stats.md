# Show most-used skills

## Context
Report which skills the user invokes most, from the SQLite usage log. Triggers:
"most-used skills", "top skills", "skill usage", "what do I use most", "which do
I invoke vs which do you invoke".

Every row is tagged with a **source**: `user` (the human typed `/skill`) or `agent`
(Claude called the Skill tool — including when the human asked for it in prose).
Data is derived from session transcripts, synced at each session's `Stop`; the
mechanics live in [../references/schema.md](../references/schema.md).

The default install location is `$HOME/.claude/skills/router/`. If you installed
the skill elsewhere, swap that path into the commands below.

## Input
Optional time window (`--days N`), result cap (`--limit N`), and source filter
(`--source user|agent|all`, default `all`).

## Steps

### 1. Query the log
All-time, with the you-vs-me split:
```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" stats --text --limit 20
```
Only what the user invokes / only what the agent invokes:
```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" stats --text --source user
python3 "$HOME/.claude/skills/router/scripts/router.py" stats --text --source agent
```
Recent window (e.g. last 30 days):
```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" stats --text --days 30 --limit 20
```
For programmatic use, drop `--text` to get JSON (`{scope, source, skills:[{skill,
count, total, by_source:{user,agent,legacy}, last_used, days_ago, description, in_catalog}]}`).

### 2. Handle the empty case
If output says no usage is recorded, no transcripts have been synced yet. Run
`router.py sync --all` to backfill from existing transcripts. Do not invent numbers.

### 3. Present
Render a compact table: rank, skill, count, the `(you: N, me: M)` split, last-used.
Mention the window (all-time vs last N days). Notes if asked:
- `user` = commands the human literally typed as `/skill`; `agent` = anything run
  via the Skill tool. Subagent invocations are excluded (main-session only).
- `legacy` counts are pre-source rows with no transcript origin (normally 0 after a
  rebuild).

## Done
Tell the user:
- The ranked list, the window it covers, and the you-vs-me split.
- Offer `--source user|agent` to see one side, `/router pick <task>` to choose a
  skill, or `--days N` for a window.
