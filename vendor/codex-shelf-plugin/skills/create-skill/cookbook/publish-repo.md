# Package a Skill as Its Own Standalone Repo

## Context
Turn a skill into a self-contained, `npx skills`–installable Git repository — its own repo, with the same structure as other published skills (e.g. `create-skill`, `agent-retro-loop`). This runs for **every** skill, **every time**, as the final step of `create`: each skill ends up as its own repo on GITHUB_OWNER's account, matching the existing collection. It is not opt-in.

A "standalone skill repo" means the skill directory **is the repository root** (`SKILL.md` sits at the top level), so the whole repo can be installed directly from a local path, a GitHub repo root, or a GitHub tree URL.

## Input
- The skill name and the path to its directory (the skill may already exist from `cookbook/create.md`, or you scaffold it fresh here).
- **GITHUB_OWNER**: the account to publish under — defaults to the authenticated `gh` account (`gh api user --jq .login`). The user has standing authorization to publish skill repos to their own account; do not pause to ask.
- **REPO_VISIBILITY**: `public` by default (matches the existing skill repos).

## Standard repo layout

Model every standalone skill repo on this structure (omit dirs the skill doesn't need):

```
<name>/                  # repository root — the skill dir IS the repo
├── SKILL.md             # REQUIRED. Root-level routing doc with YAML frontmatter
├── README.md            # REQUIRED. Human-facing: what it does, install, usage, structure
├── LICENSE              # REQUIRED for public repos (MIT unless the user says otherwise)
├── CHANGELOG.md         # Version history (start at 1.0.0 / "initial release")
├── .gitignore           # Ignore OS/editor cruft and any local-only data
├── cookbook/            # One .md per operation (if multi-operation)
├── references/          # Reference docs, taxonomies, schemas (if needed)
├── scripts/             # Executable helpers, chmod +x (if needed)
├── assets/              # Templates / boilerplate (if needed)
├── docs/                # Design notes / specs (optional)
└── examples/            # Example outputs (optional)
```

Two non-negotiables for installability:
- `SKILL.md` is at the **repo root**, not nested. `npx skills` resolves the skill from the directory/repo root.
- Everything the skill references lives **inside the repo** via relative links. No symlinks pointing outside the repo, no absolute machine-specific paths.

## Steps

### 1. Confirm the skill directory is self-contained
- `SKILL.md` at the root with valid YAML frontmatter (`name`, `description`; optionally `stages`).
- All cookbook/scripts/references/assets referenced with relative links and present on disk.
- No symlinks to files outside the directory; no hardcoded absolute paths in instructions or scripts.
- If the skill was authored inside a larger monorepo (e.g. `<monorepo>/skills/<name>/`), copy it out to its own top-level directory first so the repo root is the skill itself.

### 2. Write README.md (human-facing)
The README is for people browsing the repo — NOT a duplicate of SKILL.md. Cover:
- **Title + one-line tagline** (a `>` blockquote works well).
- **What It Does** — the value, key behaviors, when to reach for it.
- **Skill architecture / directory layout** — a small tree so contributors orient fast.
- **Commands** (for multi-operation skills) — a table mirroring SKILL.md.
- **Installation** — see step 4; show the `npx skills add` one-liner AND the manual copy paths.
- **Usage** — concrete invocation examples.
- **License** — name it (MIT).

Keep it skimmable. Tables and short sections beat prose walls.

### 3. Add LICENSE, CHANGELOG.md, .gitignore
- **LICENSE**: MIT by default (ask if the user wants another). Fill in the current year and the user's name/handle if known.
- **CHANGELOG.md**: start with an entry for the first release:
  ```markdown
  # Changelog

  ## 1.0.0
  - Initial release of <name>.
  ```
- **.gitignore**: ignore OS/editor noise and any local-only state. A safe baseline:
  ```gitignore
  .DS_Store
  *.log
  node_modules/
  .env
  .env.local
  ```

### 4. Make it `npx skills`–installable and verify
The repo must work with Vercel's Skills CLI (`https://github.com/vercel-labs/skills`). The whole repo root is the installable unit.

- Verify discovery from the local path:
  ```bash
  npx skills add <path-to-skill-repo> --list
  ```
  The new skill name MUST appear. If not, fix frontmatter/layout before continuing.
- Optional copied-install smoke test (proves bundled files travel):
  ```bash
  tmp_dir=$(mktemp -d)
  cd "$tmp_dir"
  npx skills add <path-to-skill-repo> --agent codex --copy -y
  test -f .agents/skills/<name>/SKILL.md
  ```
- Document the public install in the README once a remote exists. Both forms work:
  ```bash
  # whole repo (SKILL.md at root)
  npx skills add <owner>/<repo>
  # a specific skill from a repo that holds several
  npx skills add <owner>/<repo> --skill <name>
  ```

### 5. Initialize the Git repo
From the skill repo root:
```bash
git init
git add -A
git commit -m "feat: initial release of <name> v1.0.0"
```

### 6. Create the GitHub remote (always)
Publish the skill to its own repo under GITHUB_OWNER. This is the standing behavior — every skill, every time — so do not pause to ask. Resolve the owner first, then create the repo with a description (so it never lands blank like a half-finished repo):

```bash
owner="${GITHUB_OWNER:-$(gh api user --jq .login)}"
# DESC = the skill's one-line purpose (reuse the SKILL.md description, trimmed to a sentence)
gh repo create "$owner/<name>" --public --description "<DESC>" --source . --remote origin --push
```

If a repo with that name already exists under the owner, do not clobber it: either push to the existing remote (`git remote add origin … && git push -u origin main`) or pick a non-colliding name, and tell the user which you did.

### 7. Clean it up on GitHub
Leave the repo looking like the other published ones — clean and complete, not a scaffold dump. Run every check and fix anything that fails before declaring done:

- **Clean working tree.** `git status --porcelain` must be empty. Commit or remove anything stray; never leave uncommitted edits behind.
- **Only intended files tracked.** Review `git ls-files`. There must be no nested `.git`, no editor/OS cruft (`.DS_Store`, `*.log`), no `node_modules/`, no machine-specific or local-only files, and no symlinks pointing outside the repo. If `.gitignore` is missing any of these, add it and `git rm --cached` the offenders.
- **No leftover scaffolding.** Grep the tracked files for unresolved `TODO:` markers (`git grep -n "TODO:"`); resolve or remove them — published skills ship finished, not half-filled.
- **Description + metadata set.** Confirm the GitHub description matches the skill (`gh repo view "$owner/<name>" --json description,visibility`). Set it if empty (`gh repo edit "$owner/<name>" --description "<DESC>"`). Optionally add topics: `gh repo edit "$owner/<name>" --add-topic claude-skill,agent-skill`.
- **README renders the public install.** The README's install one-liner must be the real `npx skills add <owner>/<name>` for this repo, not a placeholder.
- **Verify the published install resolves.** Only after the push:
  ```bash
  npx skills add "$owner/<name>" --list
  ```
  The skill name MUST appear. If it does not, fix layout/frontmatter, push the fix, and re-run — do not tell the user it works until this passes.

### 8. Wire references between repos (optional)
- Add the skill to the user's library catalog (see the `library` skill) if they use one.
- If the skill should be globally available to local agents, you can ALSO symlink the installed copy (see `cookbook/create.md`, "Create Symlinks for Global Skills") — but the published repo itself must stay symlink-free.

## Done
Tell the user:
- The standalone repo path and its file tree (SKILL.md, README.md, LICENSE, CHANGELOG.md, .gitignore, plus any cookbook/scripts/references).
- `npx skills add <path> --list` discovery result (and the copied-install smoke test result if run).
- The published repo: `GITHUB_OWNER/<name>` URL, that it is `public` with a description set, and that the working tree is clean with only intended files tracked (the step 7 cleanup passed).
- The exact public install command (`npx skills add <owner>/<repo>`), verified to resolve.
