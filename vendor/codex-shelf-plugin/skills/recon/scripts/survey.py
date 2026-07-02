#!/usr/bin/env python3
"""recon survey: build a deterministic reconnaissance manifest of a project.

Enumerates the things a comprehension pass must cover — entry docs
(README/AGENTS.md/CLAUDE.md/CONTEXT*/ADRs), in-project agent skills, build/test/
lint/CI config, repo structure — and proposes a list of `sections` to divide
among read-only subagents. Emits JSON on stdout for the recon workflow's `args`.

Never reads file contents beyond frontmatter of SKILL.md; it maps the project,
it does not interpret it (that is the subagents' job). Stdlib only.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HOME = Path(os.path.expanduser("~"))
# Directories never worth walking for a conventions survey.
IGNORE_DIRS = {
    ".git", "node_modules", "dist", "build", "out", ".next", ".turbo", ".venv",
    "venv", "__pycache__", "target", ".cache", "coverage", ".pnpm", ".yarn",
    "vendor", ".idea", ".vscode", "tmp", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}
# Root-level entry docs, in rough reading-priority order.
DOC_NAMES = [
    "README.md", "README.mdx", "README", "AGENTS.md", "CLAUDE.md", "GEMINI.md",
    "CONTEXT.md", "CONTEXT-MAP.md", "CONTRIBUTING.md", "ARCHITECTURE.md",
    "DESIGN.md", "CONVENTIONS.md", "STYLE.md",
]
# Nested doc filenames worth finding throughout the tree (monorepos nest them).
NESTED_DOC_NAMES = {"CLAUDE.md", "AGENTS.md", "GEMINI.md", "CONTEXT.md", "README.md"}
# Config / convention-defining files to flag if present at the root.
CONFIG_NAMES = [
    "package.json", "tsconfig.json", "tsconfig.base.json", "biome.json", "biome.jsonc",
    ".biomerc.json", ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs",
    ".prettierrc", ".prettierrc.json", "prettier.config.js", ".editorconfig",
    "pyproject.toml", "ruff.toml", "setup.cfg", "tox.ini", "Cargo.toml", "go.mod",
    "pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json", "bun.lock", "bun.lockb",
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "Makefile", "justfile",
    "lefthook.yml", "lefthook.yaml", ".pre-commit-config.yaml", "Dockerfile",
    "docker-compose.yml", "docker-compose.yaml",
]
MAX_CODE_SECTIONS = 8  # cap on derived code-area sections; omissions are reported
# Task verbs / filler dropped when extracting focus keywords.
FOCUS_STOP = {
    "add", "create", "make", "fix", "update", "build", "new", "remove", "change",
    "the", "and", "for", "into", "onto", "with", "from", "this", "that", "a", "an",
    "to", "of", "in", "on", "support", "implement", "refactor", "improve",
}


def slugify(text: str) -> str:
    """Lowercase, hyphen-separated slug safe for a path segment."""
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return s or "overview"


def focus_tokens(focus: str | None) -> list[str]:
    """Meaningful keywords from a focus phrase (verbs/filler dropped)."""
    if not focus:
        return []
    return [t for t in re.findall(r"[a-z0-9]+", focus.lower()) if len(t) > 2 and t not in FOCUS_STOP]


def find_focus_dirs(root: Path, toks: list[str], max_depth: int) -> list[str]:
    """Directories (any depth) whose name matches a focus keyword."""
    if not toks:
        return []
    hits = []
    for dirpath, _dn, _fn in walk(root, max_depth):
        p = Path(dirpath)
        if p == root:
            continue
        base = p.name.lower()
        if any(t in base for t in toks):
            hits.append(rel(p, root))
    return sorted(set(hits))[:8]


def git_root(path: Path) -> Path | None:
    """Return the git toplevel for path, or None if not a git work tree."""
    try:
        out = subprocess.run(
            ["git", "-C", str(path), "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5,
        )
        if out.returncode == 0 and out.stdout.strip():
            return Path(out.stdout.strip())
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def parse_frontmatter(text: str) -> dict:
    """Pull name + description from a leading --- YAML frontmatter block."""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    block = text[3:end]
    out: dict[str, str] = {}
    for key in ("name", "description"):
        m = re.search(rf"^{key}:\s*(.+)$", block, re.MULTILINE)
        if m:
            out[key] = m.group(1).strip().strip("\"'")
    return out


def walk(root: Path, max_depth: int):
    """Yield (dirpath, dirnames, filenames) pruning IGNORE_DIRS and depth."""
    root_depth = len(root.parts)
    for dirpath, dirnames, filenames in os.walk(root):
        depth = len(Path(dirpath).parts) - root_depth
        if depth >= max_depth:
            dirnames[:] = []
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORE_DIRS and not d.startswith(".") or d in {".claude", ".github", ".agents"})
        yield dirpath, dirnames, filenames


def rel(path: Path, root: Path) -> str:
    """Path relative to root as a posix string."""
    return str(path.relative_to(root)).replace(os.sep, "/")


def find_docs(root: Path, max_depth: int) -> dict:
    """Locate root entry docs and nested CLAUDE/AGENTS/CONTEXT/README files."""
    root_docs = []
    for name in DOC_NAMES:
        p = root / name
        if p.is_file():
            root_docs.append({"path": rel(p, root), "bytes": p.stat().st_size})
    adr_dir = root / "docs" / "adr"
    adrs = [rel(p, root) for p in sorted(adr_dir.glob("*.md"))] if adr_dir.is_dir() else []
    nested = []
    for dirpath, _dirnames, filenames in walk(root, max_depth):
        if Path(dirpath) == root:
            continue
        for fn in filenames:
            if fn in NESTED_DOC_NAMES:
                nested.append(rel(Path(dirpath) / fn, root))
    nested = sorted(set(nested))[:60]
    return {"root_docs": root_docs, "adrs": adrs, "nested_docs": nested, "has_docs_dir": (root / "docs").is_dir()}


def find_skills(root: Path) -> list[dict]:
    """Enumerate in-project agent skills (.claude/skills, .agents/skills)."""
    skills = []
    for base in (root / ".claude" / "skills", root / ".agents" / "skills"):
        for sk in sorted(base.glob("*/SKILL.md")) if base.is_dir() else []:
            try:
                fm = parse_frontmatter(sk.read_text(encoding="utf-8", errors="replace"))
            except OSError:
                continue
            skills.append(
                {
                    "name": fm.get("name") or sk.parent.name,
                    "description": fm.get("description", ""),
                    "path": rel(sk, root),
                }
            )
    return skills


def find_configs(root: Path) -> list[str]:
    """List convention-defining config files present at the root or .github."""
    found = [name for name in CONFIG_NAMES if (root / name).is_file()]
    gh = root / ".github" / "workflows"
    if gh.is_dir():
        found += [rel(p, root) for p in sorted(gh.glob("*.y*ml"))][:20]
    return found


def count_files(path: Path, max_depth: int = 4, cap: int = 5000) -> int:
    """Bounded count of non-ignored files under path (for sizing code areas)."""
    n = 0
    for _dp, _dn, filenames in walk(path, max_depth):
        n += len(filenames)
        if n >= cap:
            return cap
    return n


def derive_code_areas(root: Path, toks: list[str]) -> tuple[list[dict], list[str]]:
    """Propose code-area sections from workspace/source dirs; report omissions.

    Areas whose path matches a focus keyword are force-kept past the cap and
    flagged priority, so the section most relevant to the task is never dropped.
    """
    candidates: list[Path] = []
    for group in ("apps", "packages", "services", "libs", "modules", "crates"):
        gdir = root / group
        if gdir.is_dir():
            candidates += [p for p in sorted(gdir.iterdir()) if p.is_dir() and p.name not in IGNORE_DIRS]
    if not candidates:
        for src in ("src", "lib", "app", "cmd", "internal", "pkg"):
            sdir = root / src
            if sdir.is_dir():
                candidates.append(sdir)
    sized = sorted(
        ({"path": rel(p, root), "files": count_files(p)} for p in candidates),
        key=lambda c: c["files"], reverse=True,
    )

    def matches(path: str) -> bool:
        return any(t in path.lower() for t in toks)

    kept = list(sized[:MAX_CODE_SECTIONS])
    kept_paths = {c["path"] for c in kept}
    for c in sized[MAX_CODE_SECTIONS:]:
        if matches(c["path"]):  # focus-relevant area dropped by the cap — pull it back in
            kept.append(c)
            kept_paths.add(c["path"])
    omitted = [c["path"] for c in sized if c["path"] not in kept_paths]
    areas = [
        {"key": "area-" + slugify(c["path"]), "title": "Code area: " + c["path"],
         "paths": [c["path"]], "kind": "code", "files": c["files"],
         **({"priority": True} if matches(c["path"]) else {})}
        for c in kept
    ]
    return areas, omitted


def build_sections(root: Path, docs: dict, skills: list, configs: list,
                   focus: str | None, focus_dirs: list[str]):
    """Assemble the ordered section list the workflow fans out over."""
    sections = []
    doc_paths = [d["path"] for d in docs["root_docs"]] + docs["adrs"] + docs["nested_docs"][:20]
    sections.append({"key": "docs-conventions", "title": "Entry docs & stated conventions",
                     "paths": doc_paths, "kind": "docs"})
    if skills:
        sections.append({"key": "agent-skills", "title": "In-project agent skills",
                         "paths": [s["path"] for s in skills], "kind": "skills"})
    sections.append({"key": "build-test-ci", "title": "Build, test, lint & CI",
                     "paths": configs, "kind": "config"})
    sections.append({"key": "structure", "title": "Repo structure & module boundaries",
                     "paths": ["."], "kind": "structure"})
    code_areas, omitted = derive_code_areas(root, focus_tokens(focus))
    sections += code_areas
    if focus:
        sections.append({"key": "focus", "title": f"Focus deep-dive: {focus}",
                         "paths": focus_dirs or ["."], "kind": "focus", "priority": True})
    return sections, omitted


def artifact_root() -> Path:
    """Resolve the recon artifact root (override via RECON_ARTIFACT_DIR)."""
    override = os.environ.get("RECON_ARTIFACT_DIR")
    return Path(override) if override else (HOME / ".claude" / "recon")


def main(argv: list[str]) -> int:
    """Build and print the recon manifest for the requested project."""
    ap = argparse.ArgumentParser(prog="survey.py", description=__doc__.splitlines()[0])
    ap.add_argument("--path", default=".", help="project directory (default: cwd)")
    ap.add_argument("--focus", default=None, help="the task/area you are about to work on")
    ap.add_argument("--max-depth", type=int, default=3, help="tree walk depth")
    args = ap.parse_args(argv)

    start = Path(args.path).resolve()
    root = git_root(start) or start
    slug = slugify(str(root))
    focus_slug = slugify(args.focus) if args.focus else "overview"
    artifact_dir = artifact_root() / slug
    artifact_path = artifact_dir / f"{focus_slug}.md"

    docs = find_docs(root, args.max_depth)
    skills = find_skills(root)
    configs = find_configs(root)
    focus_dirs = find_focus_dirs(root, focus_tokens(args.focus), args.max_depth)
    top_level = sorted(
        p.name for p in root.iterdir()
        if p.is_dir() and p.name not in IGNORE_DIRS and (not p.name.startswith(".") or p.name in {".claude", ".github", ".agents"})
    )
    sections, omitted = build_sections(root, docs, skills, configs, args.focus, focus_dirs)

    manifest = {
        "project_root": str(root),
        "is_git": git_root(start) is not None,
        "focus": args.focus,
        "focus_dirs": focus_dirs,
        "artifact_dir": str(artifact_dir),
        "artifact_path": str(artifact_path),
        "top_level_dirs": top_level,
        "docs": docs,
        "agent_skills": skills,
        "config_files": configs,
        "sections": sections,
        "omitted_code_areas": omitted,
        "section_count": len(sections),
    }
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
