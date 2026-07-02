# Enumerate Flows (Phase 0 seed)

## Context

Draft the flow inventory the gauntlet runs on. The parent does a quick first cut here to **seed Pass 1**; the Regular-User subagent then expands it to the complete set. The single most common miss is the **lifecycle flow nobody demoed** — a PR adds *install* and *connect*, and the team never tests *uninstall*, *disconnect*, *reconnect*, *revoke*, or *re-install*. A real user hits all of those. Hunt them deliberately.

## Input

- The diff: `gh pr diff <n>` per PR for a stack, or `git diff <base>...<head>` for a branch. For a stack, diff the **whole stack** base→tip — flows often span PRs (PR A adds the button, PR C wires the handler).
- The PR description / linked issue — read it for *intended* behavior, then distrust it as the full list.

## Steps

### 1. Pull the full diff and list changed surfaces

```bash
gh pr diff <n> --name-only          # or: git diff --name-only <base>...<head>
```

Map files to user-reachable surfaces:

- **Routes / pages** — router files, page components, new path segments.
- **Interactive elements** — buttons, forms, inputs, menus, dialogs, toggles, dropdowns.
- **Navigation & redirects** — `window.location`, `redirect(`, `navigate(`, OAuth `authorizationUrl`, callback handlers.
- **Server entry points** — HTTP endpoints, RPC handlers, webhook ingress, API routes (note URL prefixes like a global `/v1`).
- **Background effects a user triggers** — jobs enqueued by a click, sync shapes, emails.
- **State transitions** — any status field (pending→active→revoked), create/update/**delete**.

### 2. Write each flow as a user sentence

Name every leg, from the user's point of view:

> "User opens Settings → Integrations → clicks **Connect** → redirected to GitHub consent → approves → returned to `/callback?code=…` → connection row created → connection shows **Active**."

Each `→` is a checkpoint Passes 1–3 confirm.

### 3. Force-list the flows teams forget

Walk the feature's **whole lifecycle**, not just the create path. For anything the diff lets a user *start*, ask "and then what does a real user do later?" — and add:

- **Terminal / destructive**: delete, **disconnect**, **uninstall**, revoke, cancel, **unlink**, deactivate. First-class flows, not afterthoughts. (A real session shipped a working install+callback while *disconnect* 404'd and the delete repo method didn't even exist.)
- **Re-entry / already-in-state**: connect when already connected, **install when already installed**, the callback hit twice, re-running a terminal action.
- **Reversal / round-trip**: install→uninstall→re-install; connect→disconnect→reconnect. Does state come back clean?
- **Removed / changed behavior**: if the diff deletes/replaces a path, the OLD behavior is a flow to test (it must be gone or migrated, with no orphaned UI pointing at it).
- **Inbound flows**: webhooks, scheduled callbacks, third-party redirects — no UI button; driven with `eval`/`curl` + a signed payload (see references).
- **Multi-actor**: an org-wide resource vs a per-user one; an action one role can do and another can't.

### 4. Use the call graph, not line count, for blast radius

A changed util can fan out to many flows; a big component change may affect one. If the repo has codegraph/Serena, ask "what user-reachable entry points call this changed symbol?" rather than guessing from the diff. If you dispatch an **explorer subagent** to trace blast radius across the codebase, it runs on **`claude-sonnet-4-6` with maximum extended thinking enabled** (`model: sonnet`, max thinking budget) — same as every dispatched agent in this gauntlet.

### 5. Produce the numbered seed inventory

```
FLOW INVENTORY (seed — Persona 1 will expand)
1. Connect GitHub (user OAuth)        — entry: Integrations page "Connect"
2. Install GitHub App (org-wide)      — entry: Integrations page "Install"
3. App install callback → connection  — entry: /callback redirect
4. Inbound App webhook → react        — entry: POST /v1/webhook/:env/:provider
5. Disconnect connection (terminal)   — entry: Actions menu → Disconnect
6. UNINSTALL the GitHub App           — entry: GitHub side → revocation webhook  ← easy to forget
7. Reconnect / re-authorize           — entry: Actions menu → Reconnect
8. Install when ALREADY installed     — entry: Install while an install exists   ← easy to forget
```

## Done

Hand the parent a numbered seed inventory + a note on any surface judged "no user-facing behavior" (with why). This goes into Pass 1's brief; Pass 1 returns the authoritative, expanded version that Passes 2–3 consume.
