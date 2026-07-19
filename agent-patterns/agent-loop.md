# Agent loop (agentic-inbox)

Anchors: `Modules/Agent/Service.ts`, `Model.ts`, `Toolkit.ts`, `Prompts.ts`.

## Two model roles

| Tag | Use |
|-----|-----|
| `TriageModel` | `generateObject` decision (`strictJsonSchema`, response-healing) |
| `ToolModel` | `generateText` tool loop (`Tool.Strict` per tool) |

Keep tags separate so tests can fake either. Do not drive tools with triage model config.

## Flow (`triageEmail`)

1. `generateDecision` → structured object → `normalizeDecision` + `isSensitive(policy)`.
2. `runLoop` with `makeTriageToolkit(decision.isSensitive)` until no tools / approval / `MAX_AGENT_TURNS` (6).
3. Pending approval → save conversation `awaiting_approval`; else `complete`.
4. Diff ledger before/after → `TriageActed` events.

## Approvals

`resolveApproval`: `claimApproval` → optional edited reply body → `tool-approval-response` → resume `runLoop`.
Chat uses static `ChatToolkit` + same loop shape.

## Avoid

Sync Schema decode in the loop hot path; skipping policy when stamping `isSensitive`;
scattering OpenRouter client setup outside `Model.ts`.
