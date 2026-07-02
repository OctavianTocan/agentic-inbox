# router internals

## Usage database

Default path `<skill-dir>/data/usage.db` — the CLI resolves its own install
location via `__file__`, so the DB lives wherever the skill is installed. Override
with the `ROUTER_DB` env var. SQLite in WAL mode so concurrent sessions can write.

One row per skill invocation (not a counter) so all-time, windowed, recency, and
per-source ranking can all be derived:

```sql
CREATE TABLE invocations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    skill      TEXT NOT NULL,   -- e.g. "superpowers:brainstorming"
    args       TEXT,            -- args passed to the command/Skill tool, if any
    session_id TEXT,
    cwd        TEXT,
    ts         TEXT NOT NULL,   -- ISO-8601 UTC
    source     TEXT,            -- 'user' (typed /slash) | 'agent' (Skill tool) | NULL (legacy)
    event_id   TEXT             -- transcript record uuid (user) or tool_use id (agent)
);
CREATE INDEX idx_inv_skill ON invocations(skill);
CREATE INDEX idx_inv_ts    ON invocations(ts);
CREATE UNIQUE INDEX idx_inv_event ON invocations(event_id) WHERE event_id IS NOT NULL;
```

`event_id` is the dedup key — `sync` upserts with `INSERT OR IGNORE`, so the same
transcript can be re-scanned safely.

## Two sources, one ground truth

A skill is invoked two ways, and they are **not** the same event:

- **User types `/skill`** → the harness expands the SKILL.md *inline* as a user
  transcript record carrying `<command-name>` / `<command-args>` tags. **No `Skill`
  tool_use is produced**, so a `PostToolUse`/`Skill` hook never fires for it.
- **Agent calls the Skill tool** → an assistant `tool_use` block named `Skill`,
  which *does* fire `PostToolUse`.

So the old `PostToolUse`/`Skill` `record` hook only ever saw **agent** invocations;
user `/slash` commands were invisible to it. The transcript JSONL, however, records
*both* unambiguously — that is the ground truth `sync` reads.

## The hook (`sync` on `Stop`)

`install-hook` removes any legacy `PostToolUse`/`Skill` `record` hook and adds a
`Stop` hook (backing settings up first). The command embeds the **absolute path**
to `scripts/router.py`, so it works wherever the skill is installed:

```json
{ "hooks": { "Stop": [
  { "matcher": "*",
    "hooks": [ { "type": "command",
                 "command": "python3 \"<absolute path to scripts/router.py>\" sync" } ] } ] } }
```

- **`sync` reads the `Stop` payload from stdin**, takes `transcript_path`, and
  incrementally ingests just that session's transcript: `<command-name>` user
  records → `source='user'`, `Skill` tool_use blocks → `source='agent'`. Idempotent
  via `event_id`.
- **`sync --all`** scans every transcript under `~/.claude/projects/*/*.jsonl`;
  **`--rebuild`** clears the table and repopulates from transcripts (DB backed up
  first). `install-hook` runs this once to backfill.
- **Name reconciliation:** a bare user command (`/babysit`) is mapped to the
  agent's qualified name (`claude-mem:babysit`) so both sides group into one row.
  A user command is only counted if it matches a known skill (catalog ∪ recorded
  skills) — built-ins like `/model`, `/compact`, `/resume` are skipped.
- **Scope:** main-session invocations only. Subagent transcripts
  (`*/<session>/subagents/*.jsonl`) are excluded by design.
- **`record`** remains as a legacy entrypoint (now tags `source='agent'`) but is no
  longer wired by `install-hook`.

## Ranking (`rank`)

`blended = 0.6·relevance + 0.3·usage_norm + 0.1·recency_norm`

- **relevance** — lexical token overlap between the query and a skill's
  name+description, with a small bonus for a name-token hit. Coarse on purpose;
  the agent does the real semantic pick.
- **usage_norm** — invocation count ÷ max count across all skills.
- **recency_norm** — `1 / (1 + days_since_last_use / 30)`; 0 if never used.

The catalog is built by scanning `SKILL.md` frontmatter under `~/.claude/skills`
and `~/.agents/skills`. Plugin skills (under the plugin cache) are not scanned, so
they show with empty descriptions — usage still tracks them by name. The agent
fills gaps from the live in-context skill list.

## Workflow files

`workflows/*.md`: frontmatter (`name`, `description`, `when_to_use`) plus a
`## Steps` section of numbered steps, each naming a skill, its purpose, and a
handoff note. The `workflows` command parses frontmatter and counts `N.` lines;
the step bodies are read by the agent at run time.
