# Agentic Inbox

Shared-inbox triage agent: classify mail, apply deterministic safety policy, propose an action, optionally pause for human approval, then record effects.

## Language

**no_action**:
A proposal that triage is finished with no mutation and no human queue. Not a ledger action. Inbox status is `done_for_you`.
_Avoid_: skip, noop, leave alone (as a ledger kind), treating it as `flag_for_review`

**flag_for_review**:
A ledger action that defers the email to a human. Inbox status is `needs_attention`.
_Avoid_: no_action, “fallback when nothing fits” as a synonym for leave-alone

**archive**:
A ledger action that files the email away. Inbox status is `filed`.
_Avoid_: no_action (done without filing)

**Proposal**:
The chosen next step after classify/policy: `send_reply`, `archive`, `flag_for_review`, or `no_action`. Eval allowed/forbidden actions use this vocabulary.
_Avoid_: treating proposal options as identical to ledger `ActionKind`

**ActionKind**:
A mutating ledger effect: `send_reply`, `archive`, `flag_for_review`, or `undo`. Does not include `no_action`.
_Avoid_: ActionKind as the eval action vocabulary

**Run** (also **Thread**):
The durable identity of one triage attempt for an email. Same string is the product `runId`, the LangGraph checkpoint `thread_id`, and the HTTP resume key.
_Avoid_: approval id (as a second public identity), conversation id (as the resume key for triage), treating `runId` and `threadId` as different ids

**Retriage** (and batch `fresh`):
A demo wipe of triage state so the inbox can be walked again — not a linked historical fork.
_Avoid_: parent-linked retriage runs, treating wipe as production reprocess
