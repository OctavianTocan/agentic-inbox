# Cogram Agentic Inbox — plan (2026-07-02)

## Design

### Goal

Build the Cogram take-home ("Agentic Inbox"): a web app where an AI agent has processed an AEC project manager's inbox of 80 emails while they were away — auto-handling routine mail, pausing for human approval on sensitive mail, and surfacing everything it did with a fast review UI and cheap recovery from wrong calls. Repo: `/mnt/work/code/personal/cogram-agentic-inbox` (scaffolded from `cogram-ai-app-template`). Dataset: `data/emails.json` (80 emails, sanitized). Task brief: `docs/TASK.md`.

**Hard constraints from the brief:** sensitive emails are never auto-actioned; the user sees what the agent did and why; whole-inbox review in ~5 minutes; wrong calls easy to recover from; deliverables include a doc, 2–3 min demo video, and AI session transcripts.

**Non-goals:** real email ingestion, live incoming traffic, auth, chat-history-driven personalization, mobile layout.

### Decision log (settled with rationale)

| Decision | Choice | Why |
|---|---|---|
| Agent run | Live streaming run, results persisted | Demos the agent working; reloads instant |
| Backend | `apps/api` (Effect v4, Bun, port 8001), OpenAPI contract in `packages/api-core`; Next.js (`apps/web`) is a pure frontend | Clean service layer; template rails exist |
| LLM stack | **`@effect/ai-openrouter@4.0.0-beta.93`** (vendored-matching Effect provider over OpenRouter's API) — NOT `@openrouter/agent` | Effect-Schema-native tools (zero Zod), first-class `needsApproval` pause/resume in the shared Effect AI core (verified: `Tool.ts:274`, `Response.ts` `ToolApprovalRequestPart`, `LanguageModel.ts` `collectToolApprovals`/`executeApprovedToolCalls`), transparent JSON-serializable conversation state. Cost: hand-roll a small agent loop (~40 lines recursive `Effect.gen`) since `generateText` does one model round per call |
| Model | `openai/gpt-5.5` with `reasoning: { effort: 'low' }`, env-overridable (`OPENROUTER_MODEL`) | Semi-strong + acceptably fast; supports tools, structured outputs, reasoning effort (verified on OpenRouter) |
| Schemas | Effect Schema everywhere; strict structured output via `toCodecOpenAI` (`effect/unstable/ai/OpenAiStructuredOutput`) which returns `{ jsonSchema, codec }` | Single source of truth; no Zod anywhere |
| Action model | Routine → auto-executed (simulated send/archive) with undo; sensitive → agent pauses on `needsApproval`, human approves/denies | Approvals are ONLY for sensitive emails; at-a-glance approve/deny |
| Unified agent | ONE agent definition (toolkit + system prompt + policy predicate) with two entry points: per-email batch triage and interactive sidepanel chat | Same tools, same policy, same ledger for every actor |
| Persistence | PostgreSQL 17 (`@effect/sql-pg@4.0.0-beta.93`, exact effect pin match) in docker-compose with web + api | Action ledger + conversation history + decisions; paused approvals survive restarts |
| UI | **Four-panel**: collapsible sidebar (filters + agent trace) / email list with inbox summary on top / **detail pane** / collapsible chat sidepanel | Per user direction, informed by cloudflare/agentic-inbox + langchain agent-inbox |
| Loading states | Terminal-style text spinners ported to web from [Eronred/expo-agent-spinners](https://github.com/Eronred/expo-agent-spinners) (Braille/ASCII frames, `setInterval` — trivially portable) | AI-thinking affordances: summary loading, triage run, chat thinking, tool-call in-flight |
| Effect style | Repo `.agent/skills/effect-v4-project-starter` + `practice-code-quality` are binding; module conventions per pawrrtal `domain-effect` (role-based files, `Context.Service` repos, `Effect.Service` app services, `Schema.TaggedErrorClass`, `Effect.fn` spans, no barrels) | Owner's codified style |
| DB idiom | Copy pawrrtal `backend-ts` pattern (`apps/api/src/Infrastructure/Database/Sqlite.ts` + `Modules/Projects/Repo.ts`) with `PgClient` substituted for `SqliteClient`; `SqlClient` imported from `effect/unstable/sql` | Proven in-house pattern, exact idiom reference |
| HTTP | Effect v4 HttpApi honored fully: `HttpApi`/`HttpApiGroup`/`HttpApiEndpoint` contracts in `packages/api-core`, `HttpApiBuilder` handlers in `apps/api`, OpenAPI + Scalar docs derived from the contract | The v4-specific API discipline; template already ships this shape |
| Chat UI plumbing | Template's `ai-ui` + `design-system/ui/ai` components driven by ONE custom `ChatAdapter` implementation over our SSE stream; `ai` npm package removed entirely | Verified: `ChatAdapter` is a plain interface with zero implementations; `ai` footprint = ~16 type imports + 2 trivial helpers to inline |
| Dev access | Tailscale `tailscale serve` for web + api (tailnet-only, never funnel) | Owner can watch dev from any device |

### Architecture

**One agent, two entry points** (pattern validated by cloudflare/agentic-inbox):

- **Batch triage:** for each of the 80 emails, run the agent loop with a triage prompt and the shared toolkit. The agent calls `record_triage` (category, severity, confidence, ≤65-char why-preview, rationale, key facts) then acts: `send_reply` (draft body), `archive`, `flag_for_review`, or nothing. 8-way concurrency (`Effect.forEach { concurrency: 8 }`).
- **Sidepanel chat:** same toolkit + a few read tools (`search_emails`, `get_email`, `get_thread`, `list_ledger`), interactive prompt, conversation history in Postgres.

**Policy = the `needsApproval` predicate** on mutating tools. Deterministic code: sensitive category (change_order, claim_dispute, safety, owner_escalation) OR dollar-amount/legal-keyword signals OR low confidence → approval required. Routine + confident → auto-execute. This is doubly enforced: the batch toolset also simply omits any ungated send (capability-based defense in depth, per Cloudflare reference). **Unit-tested invariant: sensitive input can never produce an auto-executed action.**

**Approval flow (sensitive only):** agent emits `tool-approval-request` → run pauses, conversation state saved to Postgres → inbox shows the item with inline Approve/Deny → resume the conversation with a `tool-approval-response` part → tool executes (or denial synthesizes `execution-denied` and the agent files it as needs-manual-handling).

**Action Ledger** (append-only, Postgres): every tool execution by any actor (batch agent, chat agent, user) writes an entry — timestamp, actor, email id, tool, payload, undo pointer. Renders as the sidebar agent trace, feeds the chat agent via `list_ledger`, and powers undo (undo = retract simulated send, drop email back to Needs Attention, ledger records the undo itself).

**Effect services** (`apps/api`, paw-cli conventions: role-based files `Domain/Errors/Api/Http/Service/Repo`, `Context.Service` for repos, `Effect.Service` for app services, `Schema.TaggedErrorClass` errors, `Effect.fn` spans, `assertNever`, no barrels):

- `Infrastructure/Database/Postgres.ts` — `PgClient.layerConfig({ url: Config.redacted('DATABASE_URL') })`; migrations via `PgMigrator` (numbered .sql files).
- `Modules/Emails` — load/serve the 80-email dataset.
- `Modules/Triage` — decision schema, batch orchestrator (agent loop per email), run streaming.
- `Modules/Actions` — the shared tool-logic module (plain typed functions: ActionService), policy predicate, ledger repo. Toolkit definitions wrap these functions.
- `Modules/Chat` — interactive agent endpoint, conversation repo.
- `Modules/System` — health (+ DB check).

**API endpoints** (contract in `packages/api-core`, OpenAPI + Scalar docs for free):

- `POST /triage/run` — SSE/NDJSON stream of per-email events (started / decision / action / approval-pending / done).
- `GET /inbox` — emails joined with decisions, statuses, pending approvals.
- `POST /approvals/:id` — approve/deny (resumes the paused conversation).
- `POST /actions/:id/undo` — undo an auto-executed action.
- `POST /chat` — send message; SSE/NDJSON stream of text deltas + tool-call events. `GET /ledger` — trace feed.

**Streaming bridge:** `Stream.fromAsyncIterable`/Effect Stream → NDJSON `ReadableStream` responses. Frontend consumes with a small reader; the chat stream feeds the custom `ChatAdapter` (messages as text/reasoning/`dynamic-tool` parts — the template renders tool-call spinners/badges natively).

### UI (apps/web, template design system only)

Four panels (sidebar + `ResizablePanelGroup` for list/detail, chat panel on the right edge):

1. **Left sidebar** (template `sidebar.tsx`, collapsible): filters (status: needs-attention / done-for-you / filed; project; category; severity) + **Agent Trace** — ledger entries as a `Trace`/`TraceStep` timeline ("[Auto] RFI-187 → drafted + sent reply", "Blocked: PCO #14 → awaiting your approval").
2. **Inbox list:** summary block on top (counts: processed / handled / need attention / filed; per-project chips; severity breakdown) — the at-a-glance state of the inbox, with a spinner-driven loading state while it computes. Below: email list (`Item`/`ItemGroup` rows): severity `Badge`, subject, ≤65-char why-preview, status chip, timestamp. **Pending approvals pinned on top, severity-sorted, with inline Approve/Deny buttons on the row.**
3. **Detail pane** (own resizable panel, opens on row select): full email + thread context, agent rationale (markdown) + key-facts block, merged Edit/Accept card (live Accept↔Submit-edited label flip, reset-to-original), Deny/Ignore; for done items: action taken + Undo. Undo → sonner toast with action button.
4. **Right — chat sidepanel** (collapsible, stays mounted / hidden with CSS, lazy-loaded): template thread/message/composer components over the custom `ChatAdapter`. Tool calls render as friendly labeled badges (`TOOL_LABELS` map: "Searching emails…", "Undoing action…") with spinner→check. Drafts produced in chat get an "Edit & approve in inbox" bridge button that opens the detail pane prefilled.

**AI spinners:** port 3–5 terminal-style spinners from `Eronred/expo-agent-spinners` (frame arrays + interval; RN `Text` → web `span`, respecting the fixed-width container guidance) into `design-system/ui/agent-spinner.tsx`. Used for: summary computing, triage run in-flight rows, chat thinking, tool-call pending.

Keyboard: `j/k` navigate, `enter` open, `e` approve, `d` deny, `u` undo (`useShortcut` + mounted `HotkeysProvider`). First-run: streaming run view — `Progress` ("N/80") + live trace; results persist, reloads are instant.

Design constraints (DESIGN.md): OKLCH neutral palette (severity within destructive/success/muted tones), radius 4/8/12, `--elevation-*` vars, Geist Sans; `design:lint` in CI. Add a `success` Badge variant (missing in code). Move the component showcase from `/` to `/design`; inbox lands at `/`.

### Reference patterns adopted

From **cloudflare/agentic-inbox**: shared tool-logic module with protocol skins; one agent class, two entry points; batch runs write synthetic trace entries; TOOL_LABELS badges; chat→composer bridge; capability-based toolset restriction; mounted-but-hidden chat panel; prompt-injection pre-scan (stretch). From **langchain agent-inbox**: per-item action affordances; merged Edit/Accept card with reset; description-vs-key-facts split; status chips that say what the human must do; why-preview in list rows. Ours beyond both: digest summary, undo of executed actions, severity sorting, Action Ledger, project grouping.

### Error handling

- Model/tool failures: typed `AiError`/`SqlError` → tagged errors in api-core; per-email triage failures isolate (one bad email ≠ failed run; row shows "triage failed — retry").
- Malformed structured output: decode with the `toCodecOpenAI` codec, one retry, then flag the email needs-manual-triage (never guess).
- Approval safety: deny path always available; `ToolkitRequiredError` guards against dropped approvals (built into Effect AI core).
- Frontend: SSE reconnect re-reads persisted state; optimistic UI only for undo (with toast rollback on failure).

### Testing

- **The invariant test** (vitest): policy predicate — sensitive fixtures can never auto-execute; property-style over category/keyword/confidence combos.
- Repo tests against Postgres (docker-compose db) for ledger append/undo linkage.
- HttpApi handler tests via `HttpApiBuilder.toWebHandler` (no port binding), per paw-cli convention.
- Agent loop unit test with a stubbed LanguageModel layer (approval pause → resume → execution).

## Implementation plan

### Phase 0 — Spike + dev infra (de-risk before real code)

*What:* throwaway `spike/` scripts + real infra files.
1. `@effect/ai-openrouter` structured classification: `generateObject`-style call, `openai/gpt-5.5` reasoning-low, Decision schema via `toCodecOpenAI`, on 3 emails (routine RFI, safety incident e-016, ambiguous quote). **Verify:** valid decisions, sane categories, per-call latency measured.
2. Tool loop + approval: toolkit with 2 tools (one `needsApproval: true`), hand-rolled loop; trigger pause → serialize conversation to JSON → reload in a fresh process → resume with approval → tool executes. **Verify:** full pause/persist/resume cycle works.
3. SSE through Effect API: one streaming endpoint in `apps/api`, NDJSON to curl/browser. **Verify:** incremental delivery.
4. docker-compose: `postgres:17-alpine` + api + web; `.env.example` gains `DATABASE_URL`, `OPENROUTER_API_KEY`; Justfile recipes `up`, `down`, `db-clean`, `db-reset`, `db-migrate`. **Verify:** `just up` → healthy stack from clean checkout.
5. Tailscale: `tailscale serve` for web (and api), tailnet-only — set up immediately, ahead of the rest of the phase. **Verify:** owner's device reaches the dev URL; nothing public.

### Phase 1 — Rip out AI SDK, define contracts

*What:* remove `ai` from catalog + `apps/web`/`apps/api`/`packages/clients/ai-sdk` (delete that package); localize ~16 type imports in `ai-ui/types.ts`; inline `isToolUIPart`/`getToolName` in `part-provider.tsx`; replace `apps/api/Modules/Ai` scaffolding. Add `packages/api-core/Modules/{Emails,Triage,Actions,Chat}/` Domain + Errors + Api (Effect Schema, paw-cli conventions). **Verify:** `bun run ci` green with `ai` gone; OpenAPI doc renders at `/docs`.

### Phase 2 — Persistence + ActionService + policy

*What:* `@effect/sql-pg` layer, migrations (tables: `decisions`, `action_ledger`, `conversations`), `ActionLedgerRepo`, `ConversationsRepo`, `DecisionsRepo`; ActionService (shared tool-logic functions: record_triage, send_reply, archive, flag, undo); policy predicate. **Verify:** the sensitive-never-auto-executes test suite + repo tests pass.

### Phase 3 — Unified agent + endpoints

*What:* toolkit definitions wrapping ActionService (with `needsApproval` = policy), agent loop (recursive `Effect.gen` over `generateText` until no tool calls / cap), batch orchestrator (concurrency 8, per-email isolation, decision + ledger writes, approval pausing), chat entry point; endpoints `POST /triage/run` (stream), `GET /inbox`, `POST /approvals/:id`, `POST /actions/:id/undo`, `POST /chat` (stream), `GET /ledger`. **Verify:** curl the full loop — run stream completes on all 80, approvals pause, approve/deny resumes, undo appends to ledger; agent-loop unit test with stubbed model.

### Phase 4 — Inbox UI (sidebar + list + detail pane)

*What:* inbox page at `/` (showcase → `/design`); four-panel shell (`sidebar` + `ResizablePanelGroup` list/detail + chat slot); summary block; filterable list; pinned approval rows with inline Approve/Deny; **detail pane** with Edit/Accept card + Undo; sidebar filters + Trace timeline from ledger; run view (Progress + streaming updates); keyboard shortcuts; `success` Badge variant; **agent-spinner component** ported from expo-agent-spinners, wired into summary/run/row loading states. **Verify:** full review flow on real run output in the browser; 5-minute-review walkthrough.

### Phase 5 — Chat sidepanel

*What:* `ChatAdapter` implementation over `/chat` NDJSON (text/reasoning/dynamic-tool parts, new references per chunk); sidepanel with template thread/message/composer; TOOL_LABELS badges; "Edit & approve in inbox" bridge; mounted-but-hidden + lazy load. **Verify:** ask "what needs my attention?", "undo the reply to X", "approve the PCO draft" — actions land in ledger + inbox updates.

### Phase 6 — Beyond-requirements (in priority order, time-boxed)

1. Prompt-injection pre-scan (cheap model pass, fail-closed, visible "blocked" trace entry). 2. Bulk approve for pending approvals. 3. MCP surface over ActionService tools (read tools + approve_action). 4. Thread grouping via `in_reply_to`. **Verify:** each independently; skip cleanly if time runs out (they're additive).

### Phase 7 — Cleanup + deliverables

*What:* delete unused UI baggage (queue components, slash-command machinery, docs components, showcase leftovers, anything unimported) verified by typecheck + `bun run ci`; README with clean-machine run instructions (`just up`); submission doc (what/architecture/tradeoffs — incl. the SDK-choice story and "decision queue, not conversation" framing — known gaps, what's next); demo script for the 2–3 min recording; export AI transcripts. **Verify:** fresh clone + `just up` on a clean machine works; doc reviewed; recording done.

## Out of scope

Real email providers/ingestion; auth/multi-user; new-email polling; mobile; chat-history-based personalization; production deployment (docker-compose is for local/dev); evals harness.
