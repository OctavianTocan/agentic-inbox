# Ownership table and hard seam rules wording

Type: grilling
Status: resolved
Blocked by: 01, 02, 03, 04

## Question

What is the final ownership table (module → owns / must not) and the hard seam rules text (short, enforceable) for: mint `runId`, append ledger, triage pause/resume, SSE, tool side effects, Decision/run persistence — incorporating answers from the blocking tickets and the research inventory?

## Answer

### Ownership table

| Owner | Owns | Must not |
| --- | --- | --- |
| `TriageService` | Mint `runId`; create/upsert `TriageRun` lifecycle + `pending`; persist `Decision` from engine outcome; map outcomes → triage SSE; inbox join; wipe/retriage | Run the model tool loop; call `ActionLedgerRepo` / append ledger |
| `TriageEngine` (today: `AgentService.triageEmail` / `runLoop`) | One-email walk; call `ActionService` for effects; return completed \| interrupted (+ decision / actions / pending payload) | Mint `runId`; emit triage SSE; touch run/ledger/decision repos directly |
| `ActionService` | Append ledger; HTTP undo | Own run identity, SSE, or triage pause SoT |
| Toolkit | Effect AI adapter: tool name → `ActionService` call | Domain ownership; SQL; mint ids; SSE |
| Chat | Free-form chat | Triage resume key; minting triage runs |

Toolkit is wiring, not a peer domain module. ActionService is the single mutation door so ledger writes have one place to look.

### Hard rules

1. Only `TriageService` mints `runId` / `threadId`.
2. Only `ActionService` appends `action_ledger`.
3. Only `TriageService` writes `TriageRun` and triage `Decision` rows.
4. Triage resume key is `runId` only; pause payload lives on the run (`interrupted` + `pending`).
5. Only `TriageService` emits triage SSE.
6. `TriageEngine` must not talk to ledger/run/decision repos directly.
7. Chat must not define the triage resume path.

Reading aid: root `GLOSSARY.md`.
