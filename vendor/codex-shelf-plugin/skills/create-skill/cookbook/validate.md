# Validate an Existing Skill

## Context
Check whether an existing skill is well-formed, has valid frontmatter, and that its cookbook routing table matches the actual cookbook files on disk.

## Input
The user provides: the skill name or path to the skill directory.

## Steps

### 1. Locate the Skill

Search for the skill directory in this order:
1. If the user gave an absolute path, use it directly.
2. Check `~/.claude/skills/<name>/`
3. Check `~/.agents/skills/<name>/`
4. Check `.claude/skills/<name>/`

If not found in any location, report an error and stop.

### 2. Check SKILL.md Structure

Read the `SKILL.md` file and verify:

- **File exists**: `SKILL.md` must be present in the skill directory.
- **Frontmatter present**: File must start with `---` and contain a closing `---`.
- **Name field**: Frontmatter must have a `name` field. It should match the directory name.
- **Description field**: Frontmatter must have a `description` field. It must be under 1024 characters.
- **Description has triggers**: The description should contain keywords that help the agent discover the skill. Warn if it looks too generic.
- **Body size**: The SKILL.md body (after frontmatter) should be under 3000 words for cookbook-based skills. Warn if it exceeds this.
- **Stages field** (optional but recommended): If present, values must come from the valid set in `references/stages.md`. Report `WARNING` for invalid stage names.
- **suggests / benefits-from** (optional): Values should reference existing installed skills. Report `WARNING` for references to skills that can't be found.

Record issues as:
- `ERROR` — must be fixed for the skill to work.
- `WARNING` — should be fixed but will not break functionality.

### 3. Check Cookbook Consistency (If Exists)

If a `cookbook/` directory exists:

1. List all `.md` files in `cookbook/`:
   ```bash
   ls <skill_dir>/cookbook/*.md 2>/dev/null
   ```

2. Parse the routing table from SKILL.md. Look for a markdown table under a "Cookbook" heading that references cookbook files.

3. **Every cookbook file must be referenced**: For each `.md` file in `cookbook/`, verify it appears in the routing table. Report `WARNING` for unreferenced files.

4. **Every routing entry must have a file**: For each entry in the routing table, verify the corresponding `.md` file exists in `cookbook/`. Report `ERROR` for missing files.

5. **Cookbook file structure**: For each cookbook file, verify it contains:
   - A `## Context` section (or top-level description). Report `WARNING` if missing.
   - A `## Steps` section with numbered subsections. Report `WARNING` if missing.
   - A `## Done` section. Report `WARNING` if missing.

### 4. Check Resources

If a `scripts/` directory exists:
- Verify each file is executable (`-x` permission). Report `WARNING` for non-executable scripts.

If a `references/` directory exists:
- Verify each file is readable. Report `WARNING` for unreadable files.

Check no individual file exceeds 50KB:
```bash
find <skill_dir> -type f -size +50k
```
Report `WARNING` for oversized files.

### 5. Check for TODO Markers

Search for unresolved TODO markers:
```bash
grep -rn "TODO:" <skill_dir>/
```
Report `WARNING` for each TODO found, with file and line number.

### 6. Report

Present a summary:

```
Skill: <name>
Location: <path>
Structure: cookbook-based | simple

Errors (must fix):
  - <description> in <file>

Warnings (should fix):
  - <description> in <file>

OK: <count> checks passed
```

If there are no errors, tell the user the skill is valid. If there are errors, list them and suggest fixes.

## Done
Tell the user:
- Total checks run
- Number of errors and warnings
- Whether the skill is valid or needs fixes
