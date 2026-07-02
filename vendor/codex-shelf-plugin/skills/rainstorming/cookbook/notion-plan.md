# Publish the plan to Notion (Agent Plans)

## Context

Create the approved design + a step-by-step implementation plan as a new Notion page **under the Agent Plans page** (`AGENT_PLANS_PARENT` = `3733c065-308b-802b-9659-c79bd094164a`), via the **notion-cli** skill. This replaces brainstorming's local spec doc + writing-plans handoff — the Notion page is the single source of truth the user reviews and you implement from.

## Prerequisites

- The **notion-cli** skill / `ntn` CLI, authenticated (read that skill: it uses `NOTION_API_TOKEN` when set, otherwise `ntn login`). The integration must have access to the Agent Plans page. If unauthenticated or the parent page isn't reachable (`ntn api v1/pages/3733c065-308b-802b-9659-c79bd094164a`), stop and ask the user to fix access — do not silently fall back to a local file.

## Steps

### 1. Assemble the plan as Markdown

Two sections, both required:

- **Design** — the approved design: goal + non-goals, the chosen approach (and why over the alternatives), components, data flow, error handling, testing.
- **Implementation plan** — numbered **phases**, each a small reviewable unit. For every step state: *what changes* (the files/units), *the interface* it exposes or depends on, and *how it's verified* (the test/check). Order phases so each builds on the last and is independently verifiable.

Keep it concrete enough that someone could implement from it without re-deriving decisions. End with a short **Out of scope** list.

### 2. Create the page under Agent Plans

```bash
# `ntn pages create` has NO --title flag — it derives the page title from the
# first `# H1` in the content. So begin the markdown with:
#   # <Project> — plan (<YYYY-MM-DD>)
ntn pages create --parent page:3733c065-308b-802b-9659-c79bd094164a \
  --content "$(cat plan.md)" --json
```

Capture the returned **page id + URL** from the `--json` output. (Markdown tables render as Notion tables; `##` headings become headings. Confirm exact flags with `ntn pages create --help` — the CLI is self-documenting and flags vary by version.)

### 3. (Optional) attach visuals

If the design has diagrams/mockups/screenshots, upload each with `ntn files create` and append image blocks to the page (`ntn api v1/blocks/<page_id>/children` — confirm the image-block shape with `ntn api v1/blocks --docs`). Batch ≤100 blocks per call.

### 4. Self-review the page

Re-read the published page with fresh eyes: any placeholders/TODOs, internal contradictions, scope creep, or ambiguous steps? Fix inline (`ntn pages update` / append blocks).

### 5. User review gate

Tell the user: *"Plan published to `<URL>`. Please review it and tell me if you want changes before I start implementing."* Wait. If they request changes, edit the page and re-review. Only implement once they approve.

## Done

Return the Notion page URL and a one-line summary (phases + scope). Once approved, implement directly from the page — there is no separate local plan.
