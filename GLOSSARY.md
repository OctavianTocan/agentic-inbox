# Glossary

Canonical names. SQL tables may still use older column names (`triage_runs`, `proposal`, `run_id`).

## Triage

### Attempt

One triage try for one email. Id is `attemptId` (same string as LangGraph `threadId`; ledger wire field may still say `runId`). Stored as an `Attempt` row (`triage_runs` table) with lifecycle `status` (`running` | `interrupted` | `completed` | `failed`) and optional `pending` approval payload when interrupted.

### InboxOrchestrator

Batch orchestrator in `Modules/Triage/Service.ts`. Mints `attemptId`, creates and updates Attempt rows, persists Classifications from TriageAgent outcomes, maps outcomes to SSE, builds the inbox, handles wipe and retriage. Does not run the model tool loop or append the ledger.

### TriageAgent

One-email walk in `Modules/Agent/TriageAgent.ts`: classify, tools, pause or finish, call LedgerService for effects. Target API is `invoke`.

### Classification

Classify output for an email (category, severity, confidence, rationale, sensitivity, policy reasons). Stored in `decisions` table via `ClassificationsRepo`. Not an Attempt and not a ledger row. Only InboxOrchestrator should persist it from the agent outcome.

### NextAction

What the agent wants next: `send_reply`, `archive`, `flag_for_review`, or `no_action`. `no_action` is not a ledger action. Attempt field `nextAction` maps to SQL column `proposal`.

### Pause / resume

Interrupted Attempt stores a `pending` payload. Human resumes with `attemptId` only (approve, deny, optional edited body). Not a separate public `approvalId` for triage (legacy path still uses conversations).

### SSE

Batch stream events (started, classification, acted, approval pending, failed, done). Only InboxOrchestrator builds these.

### Retriage / fresh

Demo wipe of triage state so the inbox can be walked again. Not linked parent attempts.

## Agent

### TriageAgent

See Triage → TriageAgent.

### ChatAgent

Free-form inbox assistant and legacy approval resume in `Modules/Agent/ChatAgent.ts`. Must not mint Attempts or define the long-term triage resume key.

### Toolkit

Effect AI adapter: model tool names → LedgerService calls. Not a domain owner. No SQL, no attempt minting, no SSE.

### Loop

Shared tool-loop helpers in `Modules/Agent/Loop.ts` used by TriageAgent and ChatAgent.

## Actions

### LedgerService

Only door that may append the ledger (and HTTP undo). Lives in `Modules/Actions/Service.ts`. Tools and HTTP both call it.

### Ledger

Append-only `action_ledger`: send, archive, flag, undo. Triage effects should carry the attempt’s id (`runId` field on the wire / row).

### LedgerRepo

Persistence for ledger rows (`Modules/Actions/Repo.ts`). Formerly ActionLedgerRepo.

### ActionKind

Ledger mutation kinds: `send_reply`, `archive`, `flag_for_review`, `undo`. Does not include `no_action`.

## Chat

### ChatAgent

See Agent → ChatAgent.

## Product

### no_action

NextAction that finishes triage with no mutation and no human queue. Inbox status `done_for_you`. Not a ledger row.

### flag_for_review

Ledger action that defers to a human. Inbox status `needs_attention`.

### archive

Ledger action that files the email. Inbox status `filed`.

### Policy reason

Stable code for why policy forced review (`sensitive_category`, `low_confidence`, `dollar_signal`, `legal_keyword`, `safety_keyword`, `escalation_keyword`). Not raw body text.

### Trace event

Redacted stage row on an Attempt’s timeline. Not a LangSmith span or checkpoint blob.

### Experiment

Frozen eval run with versions and metrics. Not live inbox triage.

### Source

Email origin for Must-have: `seed` or `synthetic`.
