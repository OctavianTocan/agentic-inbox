# Publish the Notion Report

## Context

Turn the synthesized findings + every persona's screenshot manifest into a **single new Notion page**: the report body (coverage matrix, bugs, friction lanes, resolved conflicts, gaps) followed by a per-persona, per-flow, step-by-step screenshot walkthrough — and then, after the fix phase, the **"Fixes applied" section appended to that same page**. Uses the **notion-cli** skill (`ntn`) — read that skill first; it is self-documenting (`ntn <cmd> --help`, `ntn api <path> --docs`), so look up exact request shapes at runtime rather than trusting this file's snippets verbatim.

**One page, two phases.** This file is invoked twice against the same page: once to publish the report body + walkthrough (before fixing), and once to append "Fixes applied" (after [fix-and-document.md](fix-and-document.md) runs). The **page id captured in step 1 is the contract** that ties them together — never create a second page for the fixes.

## Prerequisites (verify BEFORE the run, not after)

- **Auth**: `NOTION_API_TOKEN` set (preferred), or `ntn login` completed. If neither, you cannot publish — stop and ask the user.
- **A parent page id** to create the report under (`ntn` makes the report a child of an existing page/database). If unknown, ask the user which Notion page to nest it under.
- The Notion integration/token must have access to that parent page (shared with the integration).

## Steps

### 1. Create the page with the report body

Assemble the synthesis as Markdown (the `## Output shape` from synthesize.md — matrix, bugs, friction, gaps, recommendations). Create the page under the parent:

```bash
ntn pages create --parent page:<PARENT_ID> \
  --title "test-user-flows — <PR/branch> — <date>" \
  --content "$(cat report-body.md)"
```

Capture the returned **page id / URL** — everything below, *and the later "Fixes applied" section*, appends to this exact page id. (Confirm flags with `ntn pages create --help`.) The body comes straight from synthesize.md's output shape: matrix, bugs, friction lanes, resolved conflicts / env artifacts, gaps, the fix list.

### 2. Upload every screenshot

For each shot in the three manifests, upload the file and keep the returned upload id alongside its caption + ordering:

```bash
ntn files create < "<artifacts>/regular/01-connect-before.png"   # → returns an upload id
```

Do this for `regular/`, `frustrated/`, `novice/` in manifest order. Build a list of `{persona, flow, step, caption, upload_id}`.

### 3. Append the screenshot walkthrough, grouped persona → flow → step

Structure the walkthrough so a reader can follow each persona's journey:

- A heading per persona (`## Regular user`, `## Frustrated user`, `## Novice`).
- Under each, a sub-heading per flow.
- Under each flow, the steps **in order**: each an image block (the uploaded screenshot) with its caption, and the step's result (✅/❌/friction note).

Append image blocks as children of the page. Look up the exact block schema at runtime — `ntn api v1/blocks --docs` and the block-children endpoint — then append something shaped like:

```bash
# Look up the precise shape first:  ntn api v1/blocks/{id}/children --docs
ntn api v1/blocks/<PAGE_ID>/children -d '{
  "children": [
    { "heading_2": { "rich_text": [{ "text": { "content": "Regular user" } }] } },
    { "heading_3": { "rich_text": [{ "text": { "content": "Flow 1 — Connect" } }] } },
    { "image": { "type": "file_upload", "file_upload": { "id": "<UPLOAD_ID>" },
                 "caption": [{ "text": { "content": "01 — Integrations page before clicking Connect (✅)" } }] } }
  ]
}'
```

Notion caps `children` at 100 blocks per call — **batch** in chunks and append sequentially so nothing is dropped. If `image` with `file_upload` isn't accepted by the installed API version, fall back to an external URL (`"external": { "url": "<url>" }`) only if the screenshots are hosted somewhere reachable; otherwise report the limitation rather than silently skipping shots.

### 4. Verify the report body landed

Re-fetch the page (`ntn pages get <PAGE_ID>`) to confirm the body + image blocks landed. If any screenshots failed to attach, say which and why — never report a complete page when shots are missing. **Do not return yet** — the fix phase runs next and appends to this same page.

### 5. After the fix phase — append "Fixes applied" to the SAME page

Once [fix-and-document.md](fix-and-document.md) has implemented the fixes and verification is green, append a "Fixes applied" / "What changed" section as new child blocks **on the page id from step 1** (not a new page). Look up the block shape at runtime (`ntn api v1/blocks/{id}/children --docs`), then append a heading plus the structured content from fix-and-document:

```bash
# Append to the EXISTING report page — never create a second page.
ntn api v1/blocks/<PAGE_ID>/children -d '{
  "children": [
    { "heading_2": { "rich_text": [{ "text": { "content": "Fixes applied" } }] } },
    { "heading_3": { "rich_text": [{ "text": { "content": "Bug 1 — disconnect 404" } }] } },
    { "bulleted_list_item": { "rich_text": [{ "text": { "content":
      "Files: …  •  What changed: …  •  Why: …  •  Test: …  •  Verified: bun run ci green" } }] } }
  ]
}'
```

Include, per fix-and-document's output: **Fixes applied** (per finding → files / what / why / test / verification, plus after-screenshots for headline flows — upload them as in step 2), **Not fixed (deliberate)** with reasons, **Needs a human decision**, and the **final verification** state. Batch in ≤100-block chunks as in step 3. Re-fetch the page to confirm the section landed.

## Done

Hand back the single Notion page URL plus a one-line count ("N personas, M flows, K screenshots; F fixed / D deferred"). The page carries **both** the findings report and the "Fixes applied" section — never a separate page for the fixes. On any publish/append failure, surface the assembled markdown + the local screenshot paths so the work isn't lost, and state exactly what blocked it (auth / parent page / API shape).
