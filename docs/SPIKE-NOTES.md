# Spike notes — Phase 0 items 1-2 (2026-07-02)

De-risking the two riskiest assumptions in PLAN.md against the **real** OpenRouter
key (`openai/gpt-5.5`, reasoning effort `low`). Phase 0 throwaway scripts were run
against the live API; real output is quoted below. The throwaway code has been removed;
findings are implemented in `packages/api-core` + `apps/api`.

## TL;DR for wave 3

1. **Structured triage works** with `LanguageModel.generateObject({ schema })` — but
   only with `strictJsonSchema: true` on the model config, and **no `Schema.check`
   refinements on the output schema**. See gotchas #1 and #2.
2. **Tool loop + approval persist/resume works** end to end across a fresh process,
   using the built-in `needsApproval` / `tool-approval-request` / `tool-approval-response`
   machinery. No custom pause logic needed — just serialize `Prompt.Prompt` and re-run.
3. **`strictJsonSchema` and tools do not mix.** gpt-5.5 rejects `generateObject`'s
   strict path AND tool defs differently. Wave 3 needs **two model configs** (or a
   per-call override): strict-on for `generateObject`, and tools carrying
   `Tool.Strict, true` for `generateText`. See gotcha #3 — this is the biggest deviation.

## Layer wiring (verified working)

`OpenRouterLanguageModel.layer` provides `LanguageModel.LanguageModel`; it needs an
`OpenRouterClient` (from `layerConfig`, needs `HttpClient`) and an `IdGenerator`.
`IdGenerator.layer` requires `{ alphabet, size }` — Phase 0 used the prebuilt
`IdGenerator.defaultIdGenerator` via `Layer.succeed` instead.

```ts
import { Config, Layer, Redacted } from "effect"
import { IdGenerator } from "effect/unstable/ai"
import { FetchHttpClient } from "effect/unstable/http"
import { OpenRouterClient, OpenRouterLanguageModel } from "@effect/ai-openrouter"

const ClientLive = OpenRouterClient.layerConfig({
  apiKey: Config.map(Config.string("OPENROUTER_API_KEY"), Redacted.make)
}).pipe(Layer.provide(FetchHttpClient.layer))

const ModelLive = OpenRouterLanguageModel.layer({
  model: "openai/gpt-5.5",
  config: { reasoning: { effort: "low" }, strictJsonSchema: true } // strict for generateObject only
}).pipe(
  Layer.provideMerge(Layer.succeed(IdGenerator.IdGenerator, IdGenerator.defaultIdGenerator)),
  Layer.provide(ClientLive)
)
```

Reasoning effort goes in `config.reasoning.effort` (`"low"`), not provider options.
The `@effect/ai-openrouter` barrel exports `OpenRouterLanguageModel` / `OpenRouterClient`;
the shared AI core is `effect/unstable/ai` (barrel: `LanguageModel`, `Tool`, `Toolkit`,
`Prompt`, `Response`, `IdGenerator`, `OpenAiStructuredOutput`). The published npm
`effect` package does NOT expose per-module paths like `effect/unstable/ai/LanguageModel`
— import the namespaces from the `effect/unstable/ai` barrel.

## Script A — structured triage (`generateObject`)

- `generateObject({ schema, objectName, prompt })` requires `LanguageModel` in context.
  The provider applies `toCodecOpenAI` internally (its `codecTransformer`), so you pass
  the plain Effect Schema — **you do not call `toCodecOpenAI` yourself**. PLAN.md said
  "Decision schema via `toCodecOpenAI`"; in practice `generateObject({ schema })` is the
  idiomatic path and does the transform for you. `response.value` is the decoded object;
  `response.usage` carries token counts.
- Decisions are sane and correctly separate sensitive from routine:

```
=== e-001 (routine RFI) — 4056ms ===
category: rfi        severity: elevated   confid.: 0.93
why: Finish ambiguity affects budget and long-lead release (53 chars)
=== e-016 (safety incident) — 2764ms ===
category: safety     severity: sensitive  confid.: 1
why: Fall arrest anchor failure with OSHA notified (45 chars)
=== e-012 (ambiguous pricing quote) — 3284ms ===
category: vendor_quote  severity: elevated  confid.: 0.95
why: Updated glass quote with price increase and capacity deadline (61 chars)
```

- The model reliably respected the `whyPreview <= 65 chars` instruction from the prompt
  (45–61 chars observed) even though the length is NOT enforced by the schema (see #2).

### Latency (per call, reasoning effort low)

Two clean runs, ms per call:

| email | run 1 | run 2 |
|---|---|---|
| e-001 | 4447 | 4056 |
| e-016 | 2896 | 2764 |
| e-012 | 3910 | 3284 |
| **avg** | **3751** | **3368** |

**~2.8–4.5s per structured call.** For batch triage of 80 emails at concurrency 8
(PLAN.md), expect roughly `80/8 * ~3.5s ≈ 35s` best case, more with variance/retries.
The streaming run view and per-row spinners in Phase 4 are justified — this is not instant.

## Script B — tool loop + approval persist/resume

Toolkit with two tools; `send_reply` carries `needsApproval: true`:

```ts
const InboxToolkit = Toolkit.make(RecordTriage, SendReply)
// handlers via toolkit.toLayer({ record_triage: ..., send_reply: ... })
```

Hand-rolled loop (recursive `Effect.gen`, turn cap 6). The idiom mirrors the vendored
`Chat.ts`: `Prompt.make(input)` → `LanguageModel.generateText({ toolkit, prompt })` →
`Prompt.concat(prompt, Prompt.fromResponseParts(response.content))`, recurse until the
model stops calling tools:

```ts
const response = yield* LanguageModel.generateText({ toolkit: InboxToolkit, prompt: initial })
const nextPrompt = Prompt.concat(initial, Prompt.fromResponseParts(response.content))
const approvals = response.content.filter(p => p.type === "tool-approval-request")
if (approvals.length > 0) return { _tag: "awaiting-approval", prompt: nextPrompt, approvals }
```

**Pause/persist/resume round-trip shape.** When `send_reply` is called, `generateText`
does NOT execute it — it returns a `tool-approval-request` part. The auto tool
(`record_triage`) executes normally in the same loop. Live pause output:

```
[tool] record_triage e-012 -> routine
PAUSED after 2 turn(s). Pending approvals:
  approvalId=id_mqdUa8SKTSl2vesM toolCallId=call_dfkDUV1sU15gMne3sg2Fmyu6
```

Serialize the accumulated conversation with the `Prompt.Prompt` codec
(`Schema.encodeSync(Prompt.Prompt)` → JSON; `Schema.decodeSync(Prompt.Prompt)` to
restore). The persisted `prompt.content` roles are:

```
[ system, user, assistant(tool-call record_triage), tool(tool-result), assistant ]
```

The final assistant message holds `[ tool-call(send_reply), tool-approval-request ]`,
where `tool-approval-request.toolCallId` === the `send_reply` tool-call id, and
`approvalId` links the request to its response. **Note the tool-call params (the drafted
reply body, the triage fields) live in the assistant `tool-call` part — the
`tool-approval-request` part itself carries only `approvalId` + `toolCallId`.** To render
"here's the draft awaiting approval" in the UI, read the matching `tool-call` part, not
the approval-request part.

**Resume in a FRESH process:** load the JSON, decode to `Prompt.Prompt`, append a
`tool-approval-response` part in a `tool` message, and re-run the same loop. The built-in
`collectToolApprovals` / `executeApprovedToolCalls` inside `generateText` picks it up and
executes (or denies) the gated tool — no custom resume machinery:

```ts
const resumed = Prompt.concat(history, Prompt.make([{
  role: "tool",
  content: approvals.map(a => ({ type: "tool-approval-response", approvalId: a.approvalId, approved: true }))
}]))
yield* runLoop(resumed, savedTurns)
```

Live approve output (fresh process — `send_reply` now executes):

```
Loaded paused state (1 pending approval(s)) in FRESH process.
Appended tool-approval-response (approved=true). Resuming loop...
  [tool] send_reply EXECUTED for e-012
RESUME COMPLETE after total 3 turn(s).
Final assistant text: Triaged as routine vendor quote / pricing update, and drafted a short acknowledgment reply to Rachel.
```

Live **deny** output (`approved: false`, optional `reason`) — `send_reply` never fires,
and the model files it for manual handling, matching PLAN's `execution-denied` flow:

```
Appended tool-approval-response (approved=false). Resuming loop...
RESUME COMPLETE after total 3 turn(s).
Final assistant text: ... a short acknowledgment reply was drafted, but the PM declined the auto-reply and will handle it manually.
```

## Gotchas (each cost real debugging time)

1. **`strictJsonSchema: true` is MANDATORY for `generateObject`.** Without it, gpt-5.5
   silently drops required fields and adds stray ones (observed: returned only
   `category`, `severity`, `whyPreview`; omitted `confidence`, `rationale`, `keyFacts`;
   injected an `id`). Decode then fails `Missing key at ["confidence"]`. With strict on,
   all fields come back. → Wave 3: set `strictJsonSchema: true` for the triage model.

2. **Do NOT put `Schema.check(...)` refinements on a structured-output schema.**
   `Schema.Number.check(Schema.isBetween(0,1))` and `Schema.String.check(Schema.isMaxLength(65))`
   caused `Expected <filter>, got 0.93 at ["confidence"]` on decode: strict-mode JSON
   Schema rewriting drops the numeric-range/length constraints from what's sent to the
   model, but the decode codec still enforces the filter, so valid model output fails to
   decode. → Wave 3: keep the Decision schema fields plain (`Schema.Number`,
   `Schema.String`, `Schema.Literals` for enums) and validate ranges/`whyPreview` length
   in application code after decode (or with a `.pipe` transform), not via schema checks
   on the output schema. (v4 check names, for reference: `Schema.isBetween`,
   `Schema.isMaxLength` — `Schema.between`/`Schema.maxLength` do not exist.)

3. **gpt-5.5 rejects tool defs sent with `strict: null`** —
   `400 "[0] type: Tool type is explicitly modeled and must match its strict schema"`.
   The Effect provider sends `strict: Tool.getStrictMode(tool) ?? null` per tool; the
   default is `null`, which gpt-5.5 refuses. Fix: annotate each tool with
   `Tool.make(...).annotate(Tool.Strict, true)` so the provider emits `strict: true`
   (verified: rewriting the outgoing body `strict: null → true` also fixes it, confirming
   the cause). **Consequence:** the global `strictJsonSchema` config knob is a trap for a
   mixed workload — it forces `generateObject` strict (good) but ALSO makes the tool path
   send strict schemas that gpt-5.5 handles inconsistently. Wave 3 should:
   - use `strictJsonSchema: true` ONLY on the model instance used for `generateObject`
     triage, and
   - drive tool strictness per-tool via `Tool.Strict` (not the global config),
   or scope config per call with `OpenRouterLanguageModel.withConfigOverride`.
   The batch triage agent and the chat agent both call `generateText` with tools, so both
   need the `Tool.Strict, true` annotation on every mutating tool.

4. **v4 API name drift from v3 muscle memory** (all hit during the spike):
   `Effect.catchAll` → `Effect.catch` (or `catchCause`/`catchReason`); number/string
   checks are `Schema.isBetween` / `Schema.isMaxLength`, not `between`/`maxLength`;
   `IdGenerator.layer` needs `{ alphabet, size }` (use `defaultIdGenerator` for a no-arg
   default). Verify every unstable signature in `vendor/effect-smol`, never from v3 memory.

5. **HTTP request body is a `Uint8Array`, not a string.** When intercepting the outgoing
   request (e.g. to debug what's sent), decode with `new TextDecoder().decode(bytes)`;
   `request.body.body` is bytes. `transformClient` on `layerConfig` applies to the
   generated client methods; to intercept the raw wire request, wrap the base
   `HttpClient` layer instead. (Only needed for debugging — not for production.)

## Deviations wave 3 must make from PLAN.md

- **Decision schema:** PLAN.md line 87 says decode with the `toCodecOpenAI` codec. Use
  `generateObject({ schema })` (which applies `toCodecOpenAI` internally) and keep the
  schema free of `Schema.check` refinements (gotcha #2). Enforce `confidence ∈ [0,1]` and
  `whyPreview ≤ 65` in code after decode. The one-retry-then-flag error path (PLAN.md
  line 87) still applies for genuinely malformed output.
- **strictJsonSchema is not a single global setting** (gotcha #3). The triage
  `generateObject` model wants it ON; the tool-calling `generateText` path wants per-tool
  `Tool.Strict, true` instead. Plan for two model configs (or per-call override) rather
  than one shared `OpenRouterLanguageModel.layer`.
- **Every mutating tool needs `.annotate(Tool.Strict, true)`** in `Modules/Actions`
  toolkit definitions, or gpt-5.5 400s on the very first tool-bearing request.
- **Approval state = the serialized `Prompt.Prompt`.** PLAN.md's Postgres `conversations`
  table should store the encoded prompt JSON (via `Schema.encode(Prompt.Prompt)`) plus the
  pending `{ approvalId, toolCallId }` list. Resume = decode → append
  `tool-approval-response` → re-run the loop. No bespoke pause/resume state machine is
  needed; the Effect AI core owns it. The undo/undo-ledger work is separate from this.
- **Latency is real (~3–4s/call).** The streaming run view, progress bar, and per-row
  spinners (Phase 4) are load-bearing, not polish.

## Addendum: learnings from the slice build's full live run (2026-07-02)

A parallel insurance implementation (branch `slice`) ran the complete 80-email triage against the live API. Binding facts for the real implementation:

1. **Bun kills idle SSE streams at ~10s.** A full 80-email triage stream exceeds it. Fix (proven): set `idleTimeout: 0` (or a large value) on the Bun server options in `apps/api/src/Main.ts` — without it `POST /triage/run` dies mid-run.
2. **Real distribution from the live run:** 80 processed → 37 auto-handled, 30 paused for approval, 13 filed; 0 sensitive auto-executed (ledger-verified). Expect ~30 pending approvals — UI must handle that volume (the plan's pin-cap is load-bearing).
3. Full-run wall clock is a few minutes at concurrency 8 with gpt-5.5 reasoning-low. Stream progress events per email or the UI looks frozen.
