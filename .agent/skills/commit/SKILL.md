---
name: commit
description: "Create small, atomic, Conventional Commits. Use when the user asks to commit, split work into commits, draft commit messages, or stage related changes — never for drive-by mega-commits."
---

# Commit

Teach the agent to land work as **small**, **atomic**, **Conventional Commits** that match this repo’s history.

## What This Skill Does

1. Land the **entire** dirty tree — every tracked change and every intentional untracked file
2. Split that tree into one-logical-change commits
3. Write Conventional Commit subjects focused on **why**
4. Stage only the files that belong to each change (narrow staging, full coverage)
5. Follow git safety rules (no secrets, no force, no surprise amends)

## When to use

- User says commit / commit this / split into commits / push with commits
- You finished a coherent slice and they asked you to land it
- A working tree mixes unrelated concerns (schema + rules + feature) that should not share one SHA

**Do not** invent commits the user did not ask for.

---

## Quick Start

1. Inspect in parallel: `git status`, `git diff` (+ `--cached`), `git log -8 --oneline`
2. Group **all** dirty files into atomic buckets (one concern each) — nothing left over
3. For each bucket: stage → commit with HEREDOC → next bucket
4. `git status` after the last commit must be clean (only secrets/ignored noise may remain, and those need a warning)

Message shape (match recent log: `feat(db):`, `docs(wayfinder):`, `fix(triage):`):

```text
type(optional-scope): imperative summary ≤ ~72 chars

Optional body: why, not a file list.
```

```bash
git commit -m "$(cat <<'EOF'
feat(triage): add runs repo with whole-entity upsert

Persist triage attempts as upsertable aggregates so services own status transitions.

EOF
)"
```

---

## Atomicity rules

One commit = one restore point a reviewer can reason about.

| Do | Don’t |
|----|--------|
| Schema migration alone | Migration + UI + evals in one commit |
| OCR/skill rule updates alone | Rules bundled with unrelated feature code |
| One module’s repo + its import renames | “Phase 1 WIP” kitchen sink |
| Test fixes required by that API change | Unrelated test flakiness |

**Split when** the message would need “and” between unrelated nouns (“add runs table and rename chat components”).

**Keep together when** the change is one behavior and tests/types must move with it to stay green (e.g. new required field + call-site defaults).

Prefer **2–5 focused commits** over one large commit when the tree clearly has layers (docs → schema → domain → wiring).

---

## Conventional Commits (this repo)

**Types** (common here): `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

**Scopes** (optional, lowercase): area nouns from the change — `db`, `triage`, `actions`, `api-core`, `wayfinder`, `web`, `ocr`, …

**Subject**:
- Imperative mood: “add”, “fix”, “expand” — not “added” / “adds”
- No trailing period
- Why-leaning: say the outcome, not every file

**Body** (optional): 1–3 lines on motivation or constraint; not a `git status` dump.

Examples from this lineage:

```text
docs(wayfinder): close Must-have map with defaults and build plan
feat(db): expand initial schema for runs, traces, and evals
```

---

## Procedure (every commit)

### 1. Survey

Run together:

- `git status`
- `git diff` and `git diff --cached`
- `git log -8 --oneline` (match tone/scope style)

### 2. Plan buckets

List proposed commits before staging, e.g.:

1. `docs(ocr): require whole-entity repos and sub-modules`
2. `refactor(triage): nest Decisions repo under Triage/Decisions`
3. `feat(triage): add TriageRunsRepo upsert surface`

Ask the user to confirm the split only if the bucketing is ambiguous; otherwise proceed when they already asked to commit.

Every path from `git status` belongs in some bucket (or is a secret / truly accidental local junk you must ask about). Do not silently skip “small” or “unrelated” files.

### 3. Stage narrowly

```bash
git add path/to/relevant/files
```

Never `git add .` unless the entire diff is one atomic change. Unstage anything that belongs in the next commit — but those files still get committed in a later bucket in the same `/commit` pass.

### 4. Commit

- HEREDOC message (see Quick Start)
- No `--no-verify` unless the user explicitly allows skipping hooks
- No `git commit --amend` unless all of: user requested amend **or** hook auto-modified files that must be included; HEAD was created by you in this conversation; commit not pushed
- If a hook **rejects** the commit: fix, then make a **new** commit (do not amend the failed one)

### 5. Verify

`git status` — clean, or only the next planned bucket left. Repeat until the working tree is clean. Leaving random edits unstaged after `/commit` is a failure.

### 6. Push

Only if the user asked to push. Prefer `git push -u origin HEAD` on feature branches.

---

## Safety (hard rules)

- **Never** update git config
- **Never** commit secrets (`.env`, credentials, private keys). Warn and leave those out; still commit everything else
- **Never** force-push `main`/`master`; warn on any `--force`
- **Never** use interactive flags (`git add -i`, `git rebase -i`)
- **Commit all non-secret dirty paths.** Local editor tweaks (e.g. `.vscode/settings.json`), docs, and “accidental” edits are still part of the tree — put them in their own `chore`/`docs` commit or ask once if the intent is truly unclear. Do not quietly leave them unstaged.

---

## Hook failures

Pre-commit may run lint/tests/typecheck. If it fails:

1. Read the hook output
2. Fix the underlying issue (or split out the broken concern)
3. Create a **new** commit with the fix

Do not disable hooks to “get it through.”

---

## Anti-patterns

- `git commit -m "wip"` / `updates` / `fix stuff`
- One commit that mixes `feat` + `docs(ocr)` + unrelated refactors
- Staging generated secrets or local-only env files
- Finishing `/commit` with leftover unstaged/untracked files (except warned-about secrets)
- Amending commits already on the remote without an explicit user request
- Squashing away atomic history the user wanted to keep when they asked for small commits

---

## Related

- User asked only to **explain** changes → no commit
- User asked for a **PR** → commit first (if needed), then follow PR workflow
- Repo skills: `domain-backend` for module layout that often lands in its own commit
