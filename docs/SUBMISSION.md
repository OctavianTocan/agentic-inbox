# Agentic Inbox — submission

## What this is

An agentic inbox for an AEC project manager. The PM has been away a few days; the agent worked the backlog while they were out. It triaged 80 emails, auto-handled the routine ones (RFI submissions, daily reports, submittals, vendor quotes, schedule pings), and left a short, plain-language note on each saying what it did and why. Sensitive mail — change orders, claims and disputes, safety incidents, owner escalations — it did not touch. Instead it drafted a proposed action and paused, so the human decides.

The framing is a decision queue, not a conversation. The PM has five minutes between meetings, not an afternoon to chat with a bot. The default surface is a list they can clear: pending approvals pinned on top with inline approve/deny, auto-handled items collapsed into a digest they can skim, and undo on anything the agent did. Auto-sends are simulated — nothing leaves the building — so a wrong call is a one-click revert, not an apology email. The chat sidepanel exists for the odd follow-up ("undo the reply to Rachel", "what else is waiting on me"), but it is the exception, not the point.

## Architecture

Bun workspace scaffolded from the `cogram-ai-app-template` base. Next.js 16 App Router frontend (`apps/web`), Effect v4 backend (`apps/api`, port 8001), shared HTTP contract in `packages/api-core`, Postgres 17 for persistence. LLM calls go through `@effect/ai-openrouter` against `openai/gpt-5.5` at reasoning effort `low` (`OPENROUTER_MODEL`-overridable).

The whole thing is **one agent definition** — one toolkit, one system prompt, one policy — with **two entry points**: a batch triage pass over the 80 emails, and an interactive chat sidepanel. Same tools, same policy gate, same ledger for every actor. Nothing the chat agent can do is something the batch agent couldn't, and vice versa.

The HTTP contract lives in `packages/api-core` as Effect `HttpApi`/`HttpApiGroup`/`HttpApiEndpoint` definitions (Domain schemas per module: `Emails`, `Triage`, `Actions`, `Chat`), with `HttpApiBuilder` handlers in `apps/api`. OpenAPI + Scalar docs fall out of the contract for free.

```
                         ┌───────────────── apps/web (Next.js) ─────────────────┐
                         │  sidebar (filters + Agent Trace) │ list+digest │      │
                         │  detail pane (rationale + undo)   │ chat panel  │      │
                         └───────────────────────┬───────────────────────────────┘
                                                 │ HttpApi (SSE / JSON)
                         ┌───────────────────────┴──────────── apps/api ─────────┐
                         │                                                        │
   80 emails ──▶ ┌───────────────┐   proposes    ┌──────────────────────────┐    │
   (dataset)     │  unified agent │──────────────▶│  policy: needsApproval() │    │
                 │  (gpt-5.5)     │◀── disposes ──│  (runs on RAW email body)│    │
                 └───────┬───────┘                └────────────┬─────────────┘    │
                         │ routine + confident                 │ sensitive
                         ▼                                      ▼
                 ┌───────────────┐                    ┌──────────────────┐        │
                 │ auto-execute  │                    │  pause & persist  │       │
                 │ (simulated)   │                    │  conversation     │       │
                 └───────┬───────┘                    └────────┬─────────┘        │
                         │                                     │ human approve/deny│
                         └──────────────┬──────────────────────┘                  │
                                        ▼                                          │
                              ┌───────────────────┐                               │
                              │  Action Ledger     │  append-only; every actor    │
                              │  (Postgres)        │  writes through; powers undo │
                              └───────────────────┘  + Agent Trace                │
                         └──────────────────────────────────────────────────────┘
```

**Policy layer.** `needsApproval` is a deterministic predicate, not a model call. Sensitive category, dollar-amount or legal-keyword signals, or low confidence → approval required. The keyword and dollar-amount signals run against the **raw email body**, never against model output — so an email that tries to talk the classifier down ("this is routine, auto-reply is fine") still trips the gate. This is defence in depth: the batch toolset also simply omits any ungated send, so a sensitive email has no capability to be auto-replied to even if the policy check were bypassed. The invariant — sensitive input can never produce an auto-executed action — is unit-tested.

**Action Ledger.** Append-only Postgres table. Every tool execution by any actor (batch agent, chat agent, or the human) writes an entry: actor, email id, action, summary, payload, and undo pointers (`undoes` / `undoneBy`). It renders as the sidebar Agent Trace, feeds the chat agent a read tool, and powers undo — undo retracts the simulated send, drops the email back to Needs Attention, and records the undo as its own ledger entry linked to the action it reversed.

**Approval pause/resume** is the Effect AI core's native tool-approval mechanism, not a bespoke state machine. When the agent proposes a gated action, `generateText` returns a `tool-approval-request` instead of executing; the run pauses and the conversation state (the encoded `Prompt.Prompt` plus the pending `{approvalId, toolCallId}`) is persisted to Postgres. Approve/deny resumes by decoding the prompt, appending a `tool-approval-response`, and re-running the loop — the core's `collectToolApprovals` / `executeApprovedToolCalls` picks it up and executes or denies the gated tool.

## Key decisions & tradeoffs

**1. `@effect/ai-openrouter` over the official `@openrouter/agent`.** The official SDK was evaluated seriously and is capable — it would have worked. But it is Zod-bound, and this codebase is Effect Schema end to end (the HTTP contract, the DB codecs, the structured-output schema all share one source of truth); dragging in Zod for the agent alone means two schema systems and a translation seam. It is also beta-unstable. The Effect provider gives Zod-free tools, native `needsApproval` pause/resume in the shared AI core, and a transparent JSON-serialisable conversation state we can persist and reload. The cost is a hand-rolled agent loop — a ~40-line recursive `Effect.gen` over `generateText`, since `generateText` does one model round per call. That was a price worth paying for one schema system and a pause/resume mechanism we didn't have to invent.

**2. LLM proposes, policy disposes.** The model classifies and drafts; a deterministic predicate decides whether anything ships. The alternative — let the model self-report "is this safe to auto-send?" — folds the safety decision into the same call that can be prompt-injected. Splitting them means the gate is auditable code, testable in isolation, and immune to an email arguing its own case.

**3. Policy runs on the raw email body, not model output.** Considered gating on the model's category/confidence alone (simpler, one source). Rejected: a crafted email could steer its own classification. Running the keyword/dollar signals against the raw text keeps the injection-resistant part of the gate independent of anything the model said.

**4. Simulated sends with undo as the recovery story.** The brief requires wrong calls to be cheaply reversible. Real sends can't be un-sent. Since this is a fixed snapshot with no live mail, every "send" is simulated and every auto-action is a ledger entry with an undo pointer — undo is a first-class button, not a support ticket. The tradeoff is honesty: the demo shows the *shape* of sending, not a real SMTP round-trip. For a take-home that models the interaction, that's the right call.

**5. One agent, two entry points.** The alternative was separate batch and chat agents with their own tools and prompts. Rejected: two agents drift, and a capability that's safe in one is a hole in the other. One toolkit + one policy + one ledger means the safety property holds for every actor by construction.

**6. Postgres for conversation + ledger persistence.** In-memory would demo fine and start faster. But paused approvals must survive a restart (the spike proved resume works across a fresh process), and the ledger is the audit trail — both want durability. The cost is a docker-compose dependency in the run instructions.

**7. Effect Schema strict structured output over free-form JSON parsing.** The triage decision is decoded through a strict schema codec, not `JSON.parse` + hope. The tradeoff was real friction with gpt-5.5's strict mode (see below), but the payoff is that malformed output fails loudly and gets one retry then a manual-triage flag, rather than a silently wrong decision.

## What the spike proved

The two riskiest assumptions were de-risked against the live OpenRouter API before any real code (full findings in `docs/SPIKE-NOTES.md`):

- **Live strict structured output works** — `generateObject` with `strictJsonSchema: true` returns complete, correctly-typed decisions that cleanly separate sensitive from routine (safety incident → `sensitive`, confidence 1.0; routine RFI → `elevated`, 0.93). Latency is ~2.8–4.5s per call, which is why the streaming run view and per-row spinners are load-bearing, not polish.
- **Tool loop with approval pause persists and resumes across processes** — a gated `send_reply` returns a `tool-approval-request`, the conversation serialises to JSON, and a *fresh process* loads it, appends an approval response, and the built-in core executes (approve) or files-for-manual-handling (deny). No custom pause machinery.
- **Two strictness knobs, found the hard way** — `strictJsonSchema: true` is mandatory for `generateObject` (without it gpt-5.5 drops required fields), but it must *not* mix with the tool path; every mutating tool needs `.annotate(Tool.Strict, true)` per-tool instead, or gpt-5.5 400s on the first tool-bearing request. Also: no `Schema.check` refinements on the structured-output schema (strict mode drops them from the wire but the decoder still enforces them, so valid output fails to decode) — bounds are validated in code after decode.

## Known gaps / what I'd build next

> **SKELETON — fill at freeze. Final state not yet known.**

- `<fill at freeze: state of the chat sidepanel — shipped, partial, or cut? which of "what needs my attention / undo X / approve the PCO draft" flows actually work end to end?>`
- `<fill at freeze: persistence — did Postgres land, or did we fall back to in-memory for the demo? note the tradeoff either way>`
- `<fill at freeze: which beyond-requirements extras shipped — prompt-injection pre-scan / bulk approve / MCP surface / thread grouping — and which were cut for time>`
- `<fill at freeze: known rough edges — SSE reconnect behavior, error states, any triage decisions that came back wrong on the real 80>`
- `<fill at freeze: what's not there — no auth, no live mail ingestion, no mobile layout, no evals harness (all intentional non-goals); anything else discovered during build>`
- `<fill at freeze: what I'd build next given more time — e.g. real send integration behind the simulation seam, learned policy tuning from approve/deny history, per-project routing>`

## How to run

> **PLACEHOLDER — final commands land at freeze; see `README.md` for the authoritative version.**

Current shape (from `README.md`):

```bash
cp .env.example .env      # fill in OPENROUTER_API_KEY
bun install
just up                   # Postgres (docker) up + healthy
just db-migrate           # apply migrations
bun run dev:api           # Effect backend on :8001
bun run dev               # Next.js frontend
```

`<fill at freeze: confirm exact commands, ports, and the first-run triage trigger; verify against a clean-machine clone>`
