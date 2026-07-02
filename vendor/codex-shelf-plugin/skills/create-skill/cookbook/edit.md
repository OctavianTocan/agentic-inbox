# Edit an Existing Skill

## Context
Modify or update an existing skill: change its description, add or remove operations, restructure its layout, or update its content.

## Input
The user provides: the skill name (or path) and what they want to change.

## Steps

### 1. Find the Skill

Search for the skill directory in this order:
1. If the user gave an absolute path, use it directly.
2. Check `~/.claude/skills/<name>/`
3. Check `~/.agents/skills/<name>/`
4. Check `.claude/skills/<name>/`

If found in multiple locations, list them and ask which one to edit. If not found, report an error and stop.

### 2. Read Current State

1. Read `SKILL.md` and extract:
   - Frontmatter (name, description, stages, suggests, benefits-from)
   - Commands table (if present)
   - Cookbook routing table (if present)
   - Variables section (if present)

2. List all files in the skill directory:
   ```bash
   find <skill_dir> -type f | sort
   ```

3. Present the current structure to the user:
   ```
   Skill: <name>
   Description: <description>
   Location: <path>
   Structure: cookbook-based | simple
   Files:
     - SKILL.md
     - cookbook/create.md
     - cookbook/validate.md
     - ...
   ```

### 3. Apply Changes

Based on what the user wants to change:

**Update description:**
- Edit the `description` field in the SKILL.md frontmatter.
- Ensure the new description still contains trigger keywords.

**Update variables:**
- Edit the Variables section in SKILL.md.
- If variables are referenced in cookbook files, update those references too.

**Add a new operation:**
1. Create a new cookbook file at `cookbook/<operation>.md` following the cookbook template:
   - Context section
   - Input section
   - Steps with numbered subsections
   - Done section
2. Add a row to the Commands table in SKILL.md.
3. Add a row to the Cookbook routing table in SKILL.md.

**Remove an operation:**
1. Delete the cookbook file: `cookbook/<operation>.md`
2. Remove the row from the Commands table in SKILL.md.
3. Remove the row from the Cookbook routing table in SKILL.md.

**Rename an operation:**
1. Rename the cookbook file: `mv cookbook/<old>.md cookbook/<new>.md`
2. Update the Commands table in SKILL.md.
3. Update the Cookbook routing table in SKILL.md.

**Rewire connections (stages changed):**
1. Read the current `stages`, `suggests`, and `benefits-from` fields.
2. For each skill currently linked, open its frontmatter and remove the back-reference (with user confirmation before writing).
3. Re-run the connection discovery scan from `cookbook/create.md` Step 3 using the new stages.
4. Present new matches and ask for approval.
5. Write approved connections to both skills.
6. Regenerate the Related Skills section in SKILL.md.

**Convert simple skill to cookbook-based:**
1. Create `cookbook/` directory.
2. Extract the inline instructions from SKILL.md into cookbook files.
3. Replace the instructions section in SKILL.md with a Commands table and Cookbook routing table.
4. Keep SKILL.md lean (<3k words).

**Convert cookbook-based to simple:**
1. Merge cookbook content back into SKILL.md inline.
2. Remove the `cookbook/` directory.
3. Replace Commands and Cookbook tables with a single Instructions section.

**Edit cookbook file content:**
1. Read the target cookbook file.
2. Apply the requested changes.
3. Ensure the file still has Context, Steps, and Done sections.

### 4. Validate

After applying changes, run the validation checks from `cookbook/validate.md`:
- Frontmatter is valid
- Routing table matches cookbook files
- No broken references
- No orphaned cookbook files

Report any issues introduced by the edit.

### 5. Done

Tell the user:
- What was changed (list each modification)
- Current skill structure after changes
- Any validation warnings to address
