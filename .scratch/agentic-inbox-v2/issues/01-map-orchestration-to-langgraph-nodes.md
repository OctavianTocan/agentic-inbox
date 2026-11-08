# Map current orchestration onto LangGraph nodes

Type: research
Status: resolved
Blocked by:

## Question

Given the current Effect agent/triage loop (`Agent/Service.ts`, `Triage/Service.ts`, `Actions/Policy.ts`, toolkit/prompts), what is the precise node-by-node mapping to the Notion graph (`load_email` → `classify_email` → `apply_policy` → `propose_action` → `approval_interrupt` / `execute_action` → `finalize`), and which behaviors today are *not* graph-shaped (batch concurrency, chat, destructive retriage) that the engine must deliberately leave outside LangGraph?

## Answer

Per-email triage already follows Notion’s stage sequence, but stages are **collapsed** into `AgentService.generateDecision` + recursive `runLoop`, not explicit nodes. Full write-up: [research/01-map-orchestration-to-langgraph-nodes.md](../research/01-map-orchestration-to-langgraph-nodes.md).

### Node mapping (gist)

| Notion node | Today | Gap |
|---|---|---|
| `load_email` | `TriageService` + `EmailsService` pass a live `Email` | No immutable run snapshot / `source` |
| `classify_email` | `generateDecision` (`TriageModel` + `DecisionFromModel`) | Fused with policy in `normalizeDecision`; no version stamps |
| `apply_policy` | `Policy.isSensitive` → `Decision.isSensitive` boolean | No `reasons[]` / `policyVersion`; cannot show model-vs-policy |
| `propose_action` | `runLoop` + triage toolkit (`record_triage` then action tools) | Recursive agent loop; no `no_action`; propose+execute fused when not sensitive |
| `approval_interrupt` | Effect `tool-approval-request` + `conversations` prompt blob | Resume runs `mode: 'chat'` → `chat_agent` / ChatToolkit; no regeneration; thin payload |
| `execute_action` | Toolkit handlers → `ActionService` ledger | Inside model loop; no `run_id + action_kind + action_revision` idempotency |
| `finalize` | SSE stream events + conversation save + decision upsert | No `triage_runs` / trace rollup / token-cost totals |

### Outside LangGraph (deliberately)

- **Batch concurrency/pacing** (`TRIAGE_CONCURRENCY`, `TRIAGE_GAP_MS`) and batch SSE aggregation — many runs, not one graph.
- **Inbox chat** (`AgentService.chat` / ChatToolkit) — separate interactive loop.
- **Destructive retriage / `fresh` wipe** — Effect/admin ops; Notion wants new linked runs instead.
- **Inbox read model, HTTP undo, approval HTTP mapping, Policy.ts implementation, repos** — Effect spine; graph calls them.
- **Future Redis / Rivet mailbox** — around the engine, not inside it.

### Ambiguities handed to later tickets

Sharpest new decision: Notion’s `no_action` branch vs today’s `ActionKind` (`send_reply` \| `archive` \| `flag_for_review` \| `undo`) — graduated to [Define no_action vs flag_for_review](12-no-action-vs-flag.md). Resume actor identity → [Freeze the TriageEngine Effect seam](02-freeze-triage-engine-seam.md); run idempotency / non-destructive retriage → [Immutable runs vs LangGraph checkpoints](03-immutable-runs-vs-checkpoints.md); chat cutover → [Cutover: delete the old orchestration loop](09-cutover-delete-old-loop.md).
