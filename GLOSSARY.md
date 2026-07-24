# Glossary

Canonical names from the ownership map. Old code names in parentheses where they still appear in the repo.

## Triage

### Attempt

One triage try for one email. Id is `attemptId` (same string as LangGraph `threadId`; wire may still say `runId`). Stored as an attempt row with lifecycle `status` (`running` | `interrupted` | `completed` | `failed`) and optional `pending` approval payload when interrupted.

(Old: Run / TriageRun / `runId`.)

### InboxOrchestrator

Batch orchestrator. Mints `attemptId`, creates and updates attempt rows, persists Classifications from TriageAgent outcomes, maps outcomes to SSE, builds the inbox, handles wipe and retriage. Does not run the model tool loop or append the ledger.

(Old: TriageService.)

### TriageAgent

One-email walk: classify, tools, pause or finish, call LedgerService for effects. Target API is `invoke`. Today this still lives mainly in `Agent/Service.ts` (`triageEmail`).

(Old: TriageEngine / AgentService.triageEmail.)

### Classification

Classify output for an email (category, severity, confidence, rationale, sensitivity, policy reasons). Stored in `decisions` today. Not an Attempt and not a ledger row. Only InboxOrchestrator should persist it from the agent outcome.

(Old: Decision.)

### NextAction

What the agent wants next: `send_reply`, `archive`, `flag_for_review`, or `no_action`. `no_action` is not a ledger action.

(Old: Proposal.)

### Pause / resume

Interrupted Attempt stores a `pending` payload. Human resumes with `attemptId` only (approve, deny, optional edited body). Not a separate public `approvalId` for triage.

### SSE

Batch stream events (started, classification, acted, approval pending, failed, done). Only InboxOrchestrator builds these.

### Retriage / fresh

Demo wipe of triage state so the inbox can be walked again. Not linked parent attempts.

## Agent

### TriageAgent

See Triage → TriageAgent.

### ChatAgent

Free-form inbox assistant. Must not mint Attempts or define the triage resume key. Today still bundled inside `Agent/Service.ts` chat paths.

(Old: AgentService.chat / conversation-tied triage approval.)

### Toolkit

Effect AI adapter: model tool names → LedgerService calls. Not a domain owner. No SQL, no attempt minting, no SSE.

## Actions

### LedgerService

Only door that may append the ledger (and HTTP undo). Tools and HTTP both call it.

(Old: ActionService.)

### Ledger

Append-only `action_ledger`: send, archive, flag, undo. Triage effects should carry the attempt’s `attemptId`.

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
