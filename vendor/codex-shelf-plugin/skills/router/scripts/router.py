#!/usr/bin/env python3
"""router: usage tracking, ranking, and workflow tooling for Claude Code skills.

Single-entry CLI used by the router skill and its Stop hook.
Subcommands:
  init          create/upgrade the usage SQLite DB
  sync          Stop-hook entrypoint: ingest invocations from session transcripts,
                tagged user (typed /slash) vs agent (Skill tool)
  record        legacy PostToolUse entrypoint (agent-only); superseded by sync
  catalog       enumerate installed SKILL.md files (name + description + source)
  stats         most-used skills, split by invocation source
  rank          shortlist skills for a request (lexical relevance + usage + recency)
  workflows     list declarative workflow definitions under workflows/
  install-hook  wire the Stop sync hook (retires the old PostToolUse hook)

Agent-facing subcommands print JSON to stdout unless --text is given.
Stdlib only; never raises in `record` so it cannot disrupt a session.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME = Path(os.path.expanduser("~"))
# .../router/scripts/router.py -> .../router
SKILL_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = SKILL_DIR / "data" / "usage.db"
DEFAULT_SETTINGS = HOME / ".claude" / "settings.json"
WORKFLOWS_DIR = SKILL_DIR / "workflows"
# Catalog roots scanned for SKILL.md files, in priority order.
CATALOG_ROOTS = [HOME / ".claude" / "skills", HOME / ".agents" / "skills"]
# Substring that marks our hook command in settings.json (idempotency guard).
# Matches the basename of the resolved script path.
HOOK_TAG = "scripts/router.py"
# Absolute path of this script, used to build a hook command that works no
# matter where the skill is installed.
_HOOK_SCRIPT = Path(__file__).resolve()

STOPWORDS = {
    "a", "an", "and", "the", "to", "of", "for", "in", "on", "with", "my", "me",
    "i", "is", "it", "this", "that", "how", "do", "can", "help", "want", "need",
    "please", "should", "would", "use", "using", "make", "get", "some", "any",
}


def now() -> datetime:
    """Return the current UTC time."""
    return datetime.now(timezone.utc)


def db_path() -> Path:
    """Resolve the usage DB path, honoring the ROUTER_DB override."""
    override = os.environ.get("ROUTER_DB")
    return Path(override) if override else DEFAULT_DB


def sync_hook_command() -> str:
    """Build the Stop hook command (transcript sync) for this exact install location."""
    return f'python3 "{_HOOK_SCRIPT}" sync'


def connect(create: bool = True) -> sqlite3.Connection:
    """Open the usage DB (WAL, busy timeout) and ensure its schema exists."""
    path = db_path()
    if create:
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=5.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS invocations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            skill      TEXT NOT NULL,
            args       TEXT,
            session_id TEXT,
            cwd        TEXT,
            ts         TEXT NOT NULL,
            source     TEXT,          -- 'user' (typed /slash) | 'agent' (Skill tool) | NULL (legacy)
            event_id   TEXT           -- transcript record uuid (user) or tool_use id (agent); dedup key
        )
        """
    )
    # Additive migration for DBs created before source/event_id existed.
    cols = {r[1] for r in conn.execute("PRAGMA table_info(invocations)")}
    if "source" not in cols:
        conn.execute("ALTER TABLE invocations ADD COLUMN source TEXT")
    if "event_id" not in cols:
        conn.execute("ALTER TABLE invocations ADD COLUMN event_id TEXT")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_inv_skill ON invocations(skill)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_inv_ts ON invocations(ts)")
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_event ON invocations(event_id) WHERE event_id IS NOT NULL"
    )
    conn.commit()
    return conn


def cmd_init(_args: argparse.Namespace) -> int:
    """Create the DB and report its path + current row count."""
    conn = connect()
    total = conn.execute("SELECT COUNT(*) FROM invocations").fetchone()[0]
    conn.close()
    print(json.dumps({"db": str(db_path()), "rows": total, "status": "ready"}, indent=2))
    return 0


def cmd_record(args: argparse.Namespace) -> int:
    """Log one skill invocation. Reads a PostToolUse event from stdin.

    Always exits 0 so a malformed event or a missing DB can never break a session.
    """
    try:
        skill = args.skill
        payload = {}
        if not skill:
            raw = sys.stdin.read() if not sys.stdin.isatty() else ""
            if raw.strip():
                payload = json.loads(raw)
            tool_input = payload.get("tool_input") or {}
            skill = tool_input.get("skill")
        if not skill:
            return 0  # not a Skill invocation we can attribute; ignore silently
        tool_input = payload.get("tool_input") or {}
        conn = connect()
        # The Skill tool only fires for agent-initiated invocations; user /slash
        # commands are expanded inline and never reach this hook. So source='agent'.
        conn.execute(
            "INSERT INTO invocations (skill, args, session_id, cwd, ts, source) VALUES (?,?,?,?,?, 'agent')",
            (
                skill,
                tool_input.get("args"),
                payload.get("session_id"),
                payload.get("cwd"),
                now().isoformat(),
            ),
        )
        conn.commit()
        conn.close()
    except Exception:
        # A counting hook must never interfere with the session.
        return 0
    return 0


# ---------------------------------------------------------------------------
# Transcript sync — the ground-truth source of both user and agent invocations
# ---------------------------------------------------------------------------
# Claude Code writes one JSONL transcript per session under ~/.claude/projects.
# A user /slash command appears as a user record carrying a <command-name> tag;
# an agent skill call appears as an assistant `tool_use` block named "Skill".
# Each record has a stable uuid (and tool_use blocks an id) used to dedup.
PROJECTS_DIR = HOME / ".claude" / "projects"
_CMD_NAME_RE = re.compile(r"<command-name>\s*/?([^<]+?)\s*</command-name>")
_CMD_ARGS_RE = re.compile(r"<command-args>([^<]*)</command-args>")


def norm_skill(name: str) -> str:
    """Normalize a skill/command name for cross-source grouping (drop plugin prefix)."""
    return name.split(":")[-1].strip().lower()


def transcript_files(only: str | None = None) -> list[Path]:
    """Transcript paths to scan: a single file if given, else every project transcript."""
    if only:
        p = Path(only)
        return [p] if p.exists() else []
    return [Path(p) for p in glob.glob(str(PROJECTS_DIR / "*" / "*.jsonl"))]


def _user_text(content) -> str:
    """Flatten a user message's content to text so command tags can be matched."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            b.get("text", "") for b in content
            if isinstance(b, dict) and b.get("type") == "text"
        )
    return ""


def extract_events(path: Path) -> list[dict]:
    """Parse one transcript into invocation events (source/skill/args/ids/ts/cwd)."""
    out: list[dict] = []
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return out
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        typ = r.get("type")
        msg = r.get("message") or {}
        ts = r.get("timestamp")
        sid = r.get("sessionId") or r.get("session_id")
        cwd = r.get("cwd")
        if typ == "user":
            text = _user_text(msg.get("content"))
            if "<command-name>" not in text:
                continue
            m = _CMD_NAME_RE.search(text)
            if not m:
                continue
            am = _CMD_ARGS_RE.search(text)
            out.append({
                "source": "user", "skill": m.group(1).strip(),
                "args": (am.group(1).strip() if am else "") or None,
                "session_id": sid, "cwd": cwd, "ts": ts, "event_id": r.get("uuid"),
            })
        elif typ == "assistant" and isinstance(msg.get("content"), list):
            for b in msg["content"]:
                if isinstance(b, dict) and b.get("type") == "tool_use" and b.get("name") == "Skill":
                    inp = b.get("input") or {}
                    skill = inp.get("skill")
                    if skill:
                        out.append({
                            "source": "agent", "skill": skill, "args": inp.get("args"),
                            "session_id": sid, "cwd": cwd, "ts": ts, "event_id": b.get("id"),
                        })
    return out


def canonical_skill_map(agent_names: set[str]) -> dict[str, str]:
    """Map normalized name -> canonical display name, qualified (plugin:skill) winning.

    Lets a bare user command (/babysit) group with the agent's qualified record
    (claude-mem:babysit). Sources: catalog, existing DB skills, this run's agent names.
    """
    canon: dict[str, str] = {}

    def offer(name: str) -> None:
        n = norm_skill(name)
        if not n:
            return
        cur = canon.get(n)
        if cur is None or (":" in name and ":" not in cur):
            canon[n] = name

    for name in build_catalog():
        offer(name)
    conn = connect()
    for (s,) in conn.execute("SELECT DISTINCT skill FROM invocations"):
        if s:
            offer(s)
    conn.close()
    for name in agent_names:
        offer(name)
    return canon


def cmd_sync(args: argparse.Namespace) -> int:
    """Ingest invocations from session transcripts, tagged user vs agent.

    Idempotent: rows dedup on event_id. `--all` scans every transcript (backfill);
    otherwise the single transcript from the Stop-hook payload (or all if none).
    `--rebuild` clears the table first so the log is rebuilt purely from transcripts
    (the DB file is backed up first).
    """
    only = None
    if not args.all:
        payload = {}
        if not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw.strip():
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    payload = {}
        only = args.transcript or payload.get("transcript_path")

    files = transcript_files(None if args.all else only)
    events: list[dict] = []
    agent_names: set[str] = set()
    for f in files:
        for ev in extract_events(f):
            events.append(ev)
            if ev["source"] == "agent":
                agent_names.add(ev["skill"])
    canon = canonical_skill_map(agent_names)

    if args.rebuild:
        src = db_path()
        if src.exists():
            backup = src.with_name(src.name + f".bak-{now().strftime('%Y%m%dT%H%M%SZ')}")
            backup.write_bytes(src.read_bytes())
        conn = connect()
        conn.execute("DELETE FROM invocations")
        conn.commit()
    else:
        conn = connect()

    added = {"user": 0, "agent": 0}
    skipped_unknown = 0
    for ev in events:
        if not ev["event_id"] or not ev["ts"]:
            continue
        n = norm_skill(ev["skill"])
        # Skip user commands that aren't skills (e.g. /model, /compact, /resume).
        if ev["source"] == "user" and n not in canon:
            skipped_unknown += 1
            continue
        # Canonicalize both sources to one name per skill (qualified wins), so a
        # bare /babysit and an agent's claude-mem:babysit collapse into one row.
        skill = canon.get(n, ev["skill"])
        cur = conn.execute(
            "INSERT OR IGNORE INTO invocations (skill, args, session_id, cwd, ts, source, event_id) "
            "VALUES (?,?,?,?,?,?,?)",
            (skill, ev["args"], ev["session_id"], ev["cwd"], ev["ts"], ev["source"], ev["event_id"]),
        )
        if cur.rowcount:
            added[ev["source"]] += 1
    conn.commit()
    conn.close()

    result = {
        "status": "synced",
        "transcripts": len(files),
        "added": added,
        "skipped_user_nonskill": skipped_unknown,
        "rebuilt": bool(args.rebuild),
    }
    if args.text:
        scope = "all transcripts" if (args.all or not only) else Path(only).name
        print(f"Synced {scope}: +{added['user']} user, +{added['agent']} agent"
              + (" (rebuilt)" if args.rebuild else ""))
    else:
        print(json.dumps(result, indent=2))
    return 0


def parse_frontmatter(text: str) -> dict:
    """Extract name/description/when_to_use from a leading --- YAML frontmatter block.

    Captures the first line of each value only; sufficient for catalog display and
    lexical matching. Returns {} if no frontmatter block is present.
    """
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    block = text[3:end]
    out: dict[str, str] = {}
    for key in ("name", "description", "when_to_use"):
        m = re.search(rf"^{key}:\s*(.+)$", block, re.MULTILINE)
        if m:
            out[key] = m.group(1).strip().strip("\"'")
    return out


def build_catalog(extra_roots: list[Path] | None = None) -> dict[str, dict]:
    """Map skill name -> {description, source, path} by scanning SKILL.md files.

    Later roots do not override earlier ones (first match wins, by priority order).
    """
    roots = list(CATALOG_ROOTS) + list(extra_roots or [])
    catalog: dict[str, dict] = {}
    for root in roots:
        for skill_md in sorted(glob.glob(str(root / "*" / "SKILL.md"))):
            try:
                fm = parse_frontmatter(Path(skill_md).read_text(encoding="utf-8", errors="replace"))
            except OSError:
                continue
            name = fm.get("name") or Path(skill_md).parent.name
            if name in catalog:
                continue
            catalog[name] = {
                "description": fm.get("description", ""),
                "source": str(root),
                "path": skill_md,
            }
    return catalog


def cmd_catalog(args: argparse.Namespace) -> int:
    """Print the enumerated skill catalog as JSON."""
    extra = [Path(args.project_dir) / ".claude" / "skills"] if args.project_dir else None
    catalog = build_catalog(extra)
    rows = [{"name": n, **v} for n, v in sorted(catalog.items())]
    print(json.dumps({"count": len(rows), "skills": rows}, indent=2))
    return 0


def _bucket(source: str | None) -> str:
    """Map a stored source value to a display bucket."""
    return source if source in ("user", "agent") else "legacy"


def usage_rows(days: int | None = None) -> dict[str, dict]:
    """Aggregate per-skill usage: total/windowed counts, last_used, and per-source splits.

    Per-source keys hold all-time counts (`user`/`agent`/`legacy`) and windowed
    counts (`user_w`/`agent_w`/`legacy_w`); windowed == all-time when no window.
    """
    conn = connect()
    cutoff = (now() - timedelta(days=days)).isoformat() if days else None

    def blank() -> dict:
        return {"total": 0, "windowed": 0, "last_used": None,
                "user": 0, "agent": 0, "legacy": 0,
                "user_w": 0, "agent_w": 0, "legacy_w": 0}

    rows: dict[str, dict] = {}
    for skill, source, cnt, last_used in conn.execute(
        "SELECT skill, source, COUNT(*), MAX(ts) FROM invocations GROUP BY skill, source"
    ).fetchall():
        r = rows.setdefault(skill, blank())
        b = _bucket(source)
        r["total"] += cnt
        r[b] += cnt
        if last_used and (r["last_used"] is None or last_used > r["last_used"]):
            r["last_used"] = last_used

    if cutoff:
        for skill, source, cnt in conn.execute(
            "SELECT skill, source, COUNT(*) FROM invocations WHERE ts >= ? GROUP BY skill, source",
            (cutoff,),
        ).fetchall():
            if skill in rows:
                r = rows[skill]
                r["windowed"] += cnt
                r[_bucket(source) + "_w"] += cnt
    else:
        for r in rows.values():
            r["windowed"] = r["total"]
            r["user_w"], r["agent_w"], r["legacy_w"] = r["user"], r["agent"], r["legacy"]
    conn.close()
    return rows


def days_since(iso_ts: str | None) -> float | None:
    """Whole-day age of an ISO timestamp, or None if never used / unparseable."""
    if not iso_ts:
        return None
    try:
        return max(0.0, (now() - datetime.fromisoformat(iso_ts)).total_seconds() / 86400.0)
    except ValueError:
        return None


def cmd_stats(args: argparse.Namespace) -> int:
    """List most-used skills (all-time or within --days), split by invocation source.

    `--source user|agent` ranks/filters by that source alone; default shows the
    you-vs-me split alongside the combined count.
    """
    windowed = bool(args.days)
    src = getattr(args, "source", "all")
    # Which count drives ranking + the headline number.
    count_key = {
        "all": "windowed" if windowed else "total",
        "user": "user_w" if windowed else "user",
        "agent": "agent_w" if windowed else "agent",
    }[src]

    catalog = build_catalog()
    usage = usage_rows(args.days)
    rows = []
    for skill, u in usage.items():
        meta = catalog.get(skill, {})
        rows.append({
            "skill": skill,
            "count": u[count_key],
            "total": u["total"],
            "by_source": {
                "user": u["user_w"] if windowed else u["user"],
                "agent": u["agent_w"] if windowed else u["agent"],
                "legacy": u["legacy_w"] if windowed else u["legacy"],
            },
            "last_used": u["last_used"],
            "days_ago": round(d, 1) if (d := days_since(u["last_used"])) is not None else None,
            "description": meta.get("description", ""),
            "in_catalog": skill in catalog,
        })
    rows.sort(key=lambda r: (r["count"], r["total"]), reverse=True)
    rows = [r for r in rows if r["count"] > 0][: args.limit]

    if args.text:
        if not rows:
            print("No skill usage recorded yet. Run `sync --all` to backfill from transcripts.")
            return 0
        scope = f"last {args.days}d" if args.days else "all-time"
        label = {"all": "Most-used skills", "user": "Most-used by you (typed /slash)",
                 "agent": "Most-used by me (Skill tool)"}[src]
        print(f"{label} ({scope}):")
        for i, r in enumerate(rows, 1):
            ago = f"{r['days_ago']}d ago" if r['days_ago'] is not None else "—"
            bs = r["by_source"]
            if src == "all":
                split = f"you: {bs['user']}, me: {bs['agent']}"
                if bs["legacy"]:
                    split += f", +{bs['legacy']} legacy"
                extra = f"  ({split})"
            else:
                extra = ""
            print(f"{i:>2}. {r['skill']:<40} {r['count']:>4}{extra}  (last: {ago})")
        return 0
    print(json.dumps(
        {"scope": f"{args.days}d" if args.days else "all", "source": src, "skills": rows},
        indent=2,
    ))
    return 0


def tokenize(text: str) -> set[str]:
    """Lowercase word-token set with stopwords and 1-char tokens removed."""
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 1 and t not in STOPWORDS}


def cmd_rank(args: argparse.Namespace) -> int:
    """Shortlist skills for a request, blending lexical relevance + usage + recency.

    Output is a candidate list with score components; the agent makes the final
    semantic pick. The script narrows, it does not decide.
    """
    qtokens = tokenize(args.query)
    catalog = build_catalog()
    usage = usage_rows(None)
    max_count = max((u["total"] for u in usage.values()), default=0)

    candidates = []
    names = set(catalog) | set(usage)
    for name in names:
        desc = catalog.get(name, {}).get("description", "")
        name_tokens = tokenize(name.replace(":", " ").replace("-", " "))
        text_tokens = name_tokens | tokenize(desc)
        coverage = (len(qtokens & text_tokens) / len(qtokens)) if qtokens else 0.0
        rel = min(1.0, coverage + (0.2 if (qtokens & name_tokens) else 0.0))
        u = usage.get(name, {"total": 0, "last_used": None})
        usage_norm = (u["total"] / max_count) if max_count else 0.0
        d = days_since(u["last_used"])
        recency_norm = (1.0 / (1.0 + d / 30.0)) if d is not None else 0.0
        blended = round(0.6 * rel + 0.3 * usage_norm + 0.1 * recency_norm, 4)
        candidates.append(
            {
                "skill": name,
                "blended": blended,
                "relevance": round(rel, 4),
                "uses": u["total"],
                "last_used_days_ago": round(d, 1) if d is not None else None,
                "description": desc,
                "in_catalog": name in catalog,
            }
        )
    candidates.sort(key=lambda c: (c["blended"], c["relevance"], c["uses"]), reverse=True)
    top = candidates[: args.limit]
    print(json.dumps({"query": args.query, "candidates": top}, indent=2))
    return 0


def cmd_workflows(args: argparse.Namespace) -> int:
    """List declarative workflow definitions (frontmatter + step count)."""
    rows = []
    for wf in sorted(glob.glob(str(WORKFLOWS_DIR / "*.md"))):
        try:
            text = Path(wf).read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        fm = parse_frontmatter(text)
        steps = len(re.findall(r"(?m)^\s*\d+\.\s", text))
        rows.append(
            {
                "name": fm.get("name") or Path(wf).stem,
                "description": fm.get("description", ""),
                "when_to_use": fm.get("when_to_use", ""),
                "steps": steps,
                "path": wf,
            }
        )
    if args.text:
        if not rows:
            print("No workflows defined. Add markdown files under workflows/.")
            return 0
        for r in rows:
            print(f"• {r['name']} ({r['steps']} steps) — {r['description']}")
        return 0
    print(json.dumps({"count": len(rows), "workflows": rows}, indent=2))
    return 0


def _is_ours(h: dict) -> bool:
    """True if a hook entry belongs to this script (any subcommand)."""
    return HOOK_TAG in h.get("command", "")


def cmd_install_hook(args: argparse.Namespace) -> int:
    """Wire the Stop sync hook (with backup), retiring the old PostToolUse record hook.

    The previous design logged agent calls live via a PostToolUse `Skill` hook; that
    path can't capture user /slash commands and would double-count against the
    transcript sync, so it is removed in favor of a single Stop -> `sync` hook.
    """
    settings_path = Path(args.settings) if args.settings else DEFAULT_SETTINGS
    settings = {}
    if settings_path.exists():
        settings = json.loads(settings_path.read_text(encoding="utf-8"))
    hooks = settings.setdefault("hooks", {})
    command = sync_hook_command()

    # 1. Drop any legacy router hook from PostToolUse (and prune emptied blocks).
    removed = 0
    post = hooks.get("PostToolUse", [])
    for block in post:
        before = block.get("hooks", [])
        kept = [h for h in before if not _is_ours(h)]
        removed += len(before) - len(kept)
        block["hooks"] = kept
    hooks["PostToolUse"] = [b for b in post if b.get("hooks")]
    if not hooks["PostToolUse"]:
        hooks.pop("PostToolUse", None)

    # 2. Ensure a Stop -> sync hook (idempotent; preserve any other Stop hooks).
    stop = hooks.setdefault("Stop", [])
    already = any(_is_ours(h) and "sync" in h.get("command", "")
                  for block in stop for h in block.get("hooks", []))
    if not already:
        stop.append({"matcher": "*", "hooks": [{"type": "command", "command": command}]})

    if settings_path.exists():
        backup = settings_path.with_name(settings_path.name + f".bak-{now().strftime('%Y%m%dT%H%M%SZ')}")
        backup.write_text(settings_path.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        settings_path.parent.mkdir(parents=True, exist_ok=True)
        backup = None
    settings_path.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")

    # 3. One-time backfill from all transcripts unless suppressed.
    backfill = None
    if not args.no_backfill:
        ns = argparse.Namespace(all=True, rebuild=True, transcript=None, text=False)
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        with redirect_stdout(buf):
            cmd_sync(ns)
        try:
            backfill = json.loads(buf.getvalue())
        except json.JSONDecodeError:
            backfill = {"raw": buf.getvalue().strip()}

    print(json.dumps({
        "status": "installed" if not already else "already-installed",
        "settings": str(settings_path),
        "backup": str(backup) if backup else None,
        "legacy_posttool_hooks_removed": removed,
        "hook": {"event": "Stop", "command": command},
        "backfill": backfill,
    }, indent=2))
    return 0


def main(argv: list[str]) -> int:
    """Parse args and dispatch to the requested subcommand."""
    parser = argparse.ArgumentParser(prog="router.py", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init", help="create/upgrade the usage DB").set_defaults(func=cmd_init)

    p_rec = sub.add_parser("record", help="log a skill invocation (legacy hook entrypoint)")
    p_rec.add_argument("--skill", help="record this skill name directly instead of reading stdin")
    p_rec.set_defaults(func=cmd_record)

    p_sync = sub.add_parser("sync", help="ingest invocations from session transcripts (Stop hook)")
    p_sync.add_argument("--all", action="store_true", help="scan every transcript (backfill) instead of the Stop payload's one")
    p_sync.add_argument("--rebuild", action="store_true", help="clear the log and rebuild from transcripts (backs up the DB first)")
    p_sync.add_argument("--transcript", help="sync only this transcript file")
    p_sync.add_argument("--text", action="store_true", help="human-readable summary")
    p_sync.set_defaults(func=cmd_sync)

    p_cat = sub.add_parser("catalog", help="enumerate installed SKILL.md files")
    p_cat.add_argument("--project-dir", help="also scan <dir>/.claude/skills")
    p_cat.set_defaults(func=cmd_catalog)

    p_stats = sub.add_parser("stats", help="most-used skills, split by invocation source")
    p_stats.add_argument("--days", type=int, help="restrict to the last N days")
    p_stats.add_argument("--limit", type=int, default=25)
    p_stats.add_argument("--source", choices=["all", "user", "agent"], default="all",
                         help="rank/filter by who invoked: user (typed /slash), agent (Skill tool), or all")
    p_stats.add_argument("--text", action="store_true", help="human-readable table")
    p_stats.set_defaults(func=cmd_stats)

    p_rank = sub.add_parser("rank", help="shortlist skills for a request")
    p_rank.add_argument("--query", required=True, help="the user's request/intent")
    p_rank.add_argument("--limit", type=int, default=8)
    p_rank.set_defaults(func=cmd_rank)

    p_wf = sub.add_parser("workflows", help="list workflow definitions")
    p_wf.add_argument("--text", action="store_true")
    p_wf.set_defaults(func=cmd_workflows)

    p_hook = sub.add_parser("install-hook", help="wire the Stop sync hook (retires the old PostToolUse hook)")
    p_hook.add_argument("--settings", help="path to settings.json (default ~/.claude/settings.json)")
    p_hook.add_argument("--no-backfill", action="store_true", help="skip the one-time transcript backfill")
    p_hook.set_defaults(func=cmd_install_hook)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
