# Setup the usage hook and DB

## Context
Install the `PostToolUse` hook that logs skill invocations and initialize the
SQLite database. Run once per machine; idempotent and safe to re-run.

## Input
Optional: a non-default settings path (`--settings`) or DB path (`ROUTER_DB`).
The default install location is `$HOME/.claude/skills/router/`. If you installed
the skill elsewhere, swap that path into the commands below.

## Steps

### 1. Initialize the database
```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" init
```
Creates `<skill-dir>/data/usage.db` (WAL mode) with the `invocations` table.
Prints the path and current row count.

### 2. Install the hook
This **edits `$HOME/.claude/settings.json`** (or `--settings` if given) — it
backs the file up first, then adds a `PostToolUse` matcher on the `Skill` tool.
Idempotent: a second run is a no-op.
```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" install-hook
```
Confirm with the user before running if they are sensitive about settings edits.
The script embeds the **absolute path** to the CLI at install time, so the
resulting hook works no matter where the skill is installed:
```json
{ "matcher": "Skill",
  "hooks": [ { "type": "command",
               "command": "python3 \"<absolute path to scripts/router.py>\" record" } ] }
```

### 3. Verify
```bash
python3 -c "import json,os;p=os.path.expanduser('~/.claude/settings.json');print('Skill' in open(p).read())"
python3 "$HOME/.claude/skills/router/scripts/router.py" stats --text
```
The hook only takes effect in **new** sessions started after install. Tell the
user to restart their session (or start a new one) so the hook loads.

## Done
Tell the user:
- DB path and that it initialized cleanly.
- That the hook was added to `settings.json` (and the backup file path).
- That counting begins in new sessions — no historical backfill.
- They can now use `/router stats`, `/router pick`, and `/router run`.
