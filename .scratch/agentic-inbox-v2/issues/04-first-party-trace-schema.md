# First-party trace event schema

Type: grilling
Status: resolved
Blocked by: 03
Assignee: cursor-grok

## Question

What normalized, redacted trace event shape will the product own (timeline steps, policy override reasons, tokens/cost/latency, checkpoint refs) such that Audit → Traces never needs raw checkpoint blobs or full prompts, and which events are mandatory for the portfolio “model vs policy disagreement” moment?

## Answer

**Two lanes:** Product `trace_events` = showcase/audit timeline. LangSmith/OTel = optional ops debug (links only later; Postgres remains SoT). Not the same store.

**Policy output:** `apply_policy` returns `{ sensitive: boolean, reasons: ReasonCode[] }` with stable codes (`sensitive_category`, `low_confidence`, `dollar_signal`, `legal_keyword`, `safety_keyword`, `escalation_keyword`). Traces store codes + short labels — never body snippets or keyword hit text.

**Event kinds** (append-only per `runId`, chronological stages):

| kind | payload (redacted) |
|--|--|
| `run_started` | emailId; opaque `policyVersion` / `promptVersion` / `graphVersion` stubs |
| `classified` | category, severity, confidence, whyPreview |
| `policy_applied` | sensitive, reasons[] (empty when not sensitive) |
| `proposed` | proposal (`send_reply` \| `archive` \| `flag_for_review` \| `no_action`), short summary |
| `approval_resolved` | verdict (`approve` \| `deny` \| `edit`); `bodyEdited: boolean` — not the body text |
| `executed` | actionKind + action_revision (ledger pointer) |
| `run_completed` / `run_failed` | status + rollup metrics |

Not every run emits every kind (approval/execute only on those paths; `no_action` skips execute).

**Mandatory for disagreement moment:** every completed/interrupted run emits `classified` + `policy_applied` + `proposed` (plus `run_started` and a terminal event). Disagreement is a **UI derivation** over those three — no dedicated `disagreement` event.

**Envelope:** `{ id, runId, seq, ts, kind, payload }`. Checkpoint join key is `runId` only (= LangGraph `thread_id`). No checkpoint blob ids or deep links in product events.

**Never store in `trace_events`:** prompts/system prompts/tool JSON; raw email body; reply drafts / edited body; checkpoint blobs / graph state; provider request/response dumps. Full rationale markdown stays on Decision/inbox, not required in traces.

**Metrics:** tokens (in/out), latency, optional estimated USD — on the **run rollup** (`run_completed` / failed / interrupted summary), not as content-bearing per-stage dumps.

**Defaults sweep:** remaining envelope/checkpoint/cost/version choices accepted as above (2026-07-15).

## Comments

- Grilling locked structured reasons, event kinds, mandatory trio, redaction, and rollup metrics; remainder accepted as defaults batch.
