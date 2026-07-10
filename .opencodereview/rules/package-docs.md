# Agentic Inbox — package & app documentation (README + AGENTS.md + DESIGN.md)

Apply **base.md** conventions plus:

## Do NOT flag

- AGENTS.md as agent delta (skills, verification, conventions) — README carries the human skim
- `DESIGN.md` as the visual source of truth for UI work
- Cross-links to package/app READMEs for deep setup

## DO flag

- README or AGENTS.md opening without a clear purpose: what this repo/package is, does, and does not do
- Docs that teach live mail integration, pagination, or auto-send on sensitive mail as supported behavior
- Docs that omit the sensitive-mail deferral rule or undo/re-triage expectation
- README that leads with directory trees before purpose
- AGENTS.md that is only commands with no “why this exists”
- Inconsistent terms for the same concept (decision vs rationale vs ledger vs approval) across packages
- DESIGN.md edits bundled into unrelated feature PRs without an explicit design-system ask
- Stale references to Contract-repo paths (`packages/execute-sdk`, `packages/turso`, `apps/cli`, MCP host, Holocron `apps/docs`)
