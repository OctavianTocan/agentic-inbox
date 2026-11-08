# Synthetic source abstraction without Rivet

Type: grilling
Status: resolved
Blocked by: 02

## Question

Without a Rivet mailbox actor, what `source` abstraction (`seed` | `pasted` | `synthetic` | `api`) and structured scenario contract are enough for Must-have — who generates synthetic emails, how ground truth is fixed before prose rendering, and what UI/API surface is deferred with Rivet?

## Answer

**Source enum on email / inbox items:** `seed` | `synthetic` (Must-have). Defer `pasted` and live `api`/Gmail to later / out of scope.

**Contract:** a **scenario** is structured facts + labels first (`persona`, `category`, `mustRequireReview`, allowed/forbidden proposals, keyFacts), then optional LLM/prose render into an `Email` shape. Ground truth is the structured scenario — never inferred from rendered prose after the fact.

**Who generates:** offline script or admin CLI that writes into `data/evals/adversarial/` or a `synthetic` mailbox table/collection. Not a Rivet actor; not a background mailbox simulation.

**UI/API Must-have:** mark `source` in data model; seed path unchanged (`data/emails.json`). Minimal “load synthetic fixture set” for evals is enough. **Defer with Rivet:** live mailbox actor, streaming ingest UI, paste-an-email mode.

## Comments

- Resolved via defaults sweep (2026-07-15).
