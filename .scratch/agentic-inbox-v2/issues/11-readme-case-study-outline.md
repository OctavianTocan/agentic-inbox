# README case-study outline

Type: grilling
Status: resolved
Blocked by: 06, 07, 08, 10

## Question

What README case-study outline and rejected-alternatives section should the portfolio open with (product statement → architecture → safety → evals → trade-offs → setup), and which measured artifacts must exist before the README rewrite is honest rather than aspirational?

## Answer

**Outline (top → bottom):**
1. Product statement — shared-inbox triage with human gates
2. Architecture — Effect spine + LangGraph `TriageEngine` seam; Postgres SoT; thin Redis coordination
3. Safety — deterministic policy reasons; model vs policy Traces moment
4. Evals — gold + adversarial; unsafe autonomy / sensitive recall; CLI experiments
5. Trade-offs / rejected alternatives — no dual Legacy engine; no Rivet mailbox; Redis ≠ domain DB; LangSmith ≠ audit trail; demo wipe not linked retriage
6. Setup — how to run app, triage, evals

**Honest only when these artifacts exist:**
- Working LangGraph triage behind the seam + resume by `threadId`
- `triage_runs` + redacted `trace_events` visible in Traces UI (incl. policy-override view)
- At least one frozen experiment result (CLI) with non-zero gold/adversarial cases
- Redis permits/rate-limit/dedup actually used on the triage path (even if local Redis)
- Synthetic/adversarial source path documented

Until then, keep README aspirational flags out — don’t claim metrics you haven’t run.

## Comments

- Resolved via defaults sweep (2026-07-15).
