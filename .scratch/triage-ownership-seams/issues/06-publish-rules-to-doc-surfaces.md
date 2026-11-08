# Publish seam rules to AGENTS, OpenCodeReview, agent-patterns

Type: grilling
Status: resolved
Blocked by: 05

## Question

Exactly which files get which excerpts of the ownership table / hard rules — among root/`apps/api` AGENTS, `.opencodereview/rules/api.md` (and/or `base.md`), and `docs/agent-patterns/` (new note vs extend `agent-loop.md` / `module-layout.md`) — so agents and reviews see one consistent story without three conflicting copies?

## Answer

Publish the same rules to three surfaces (no product code in this map — this answer is the placement decision):

1. `apps/api/AGENTS.md` — short “Triage ownership seams” block: hard rules 1–7 + pointer to root `GLOSSARY.md` and the agent-patterns note.
2. `.opencodereview/rules/api.md` — DO-flag violations of those rules (e.g. ledger append outside ActionService; minting `runId` outside TriageService; triage SSE from engine; dual decision writers; resume by `approvalId` for triage).
3. `docs/agent-patterns/triage-ownership-seams.md` (new) — full ownership table + hard rules; link from `agent-loop.md` and `module-layout.md`.

Root `AGENTS.md` only points at `apps/api/AGENTS.md` / the pattern note if a one-liner is needed — avoid three full copies of the table.
