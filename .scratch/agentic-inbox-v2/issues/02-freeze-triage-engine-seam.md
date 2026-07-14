# Freeze the TriageEngine Effect seam

Type: grilling
Status: resolved
Blocked by: 01

## Question

What exact `TriageEngine` surface should Effect call (`start` / `resume` / `replay` / other), what inputs/outputs belong on that boundary vs staying in `TriageService` / `ActionService`, and how do stream events (`TriageStreamEvent`) and approval resolution flow through the seam without leaking LangGraph types into HTTP handlers?

## Answer

**Surface:** `TriageEngine.invoke` only (Deep Agents / LangGraph style). No `start` / `resume` / `replay` methods. No LangGraph types (`Command`, etc.) outside the adapter.

**Calls:**
1. New run — caller mints `threadId`, then `invoke(email, { threadId })` with a full `Email` (same idea as today’s `triageEmail`).
2. After human — `invoke({ resume: { verdict, editedBody? } }, { threadId })`.

**Return:** discriminated outcome
- `completed` — `decision` + `actions`
- `interrupted` — `threadId` + pending UI payload (`action`, `summary`, `payload`, …) + optional `decision`

**Identity:** `threadId` is the only pause/continue key. Drop parallel `approvalId`. Inbox pending id and HTTP use `threadId` (e.g. `POST /threads/:threadId/resume` with `approve` | `deny` + optional `editedBody`).

**Layers:**
| | Owns |
|--|--|
| **TriageEngine** | One-email triage walk; on execute, calls `ActionService` (side effects inside the run, like LangGraph tools after approve). |
| **TriageService** | Batch, mint `threadId`, map invoke outcomes → `TriageStreamEvent` SSE, inbox join, wipe/retriage. |
| **ActionService** | Ledger writes; also direct HTTP undo. |
| **Resume HTTP** | Human answer → second `invoke`. |
| **Chat** | Not this seam (cutover ticket). |

**Streams:** Engine does not stream. `TriageService` builds today’s SSE from invoke outcomes.
