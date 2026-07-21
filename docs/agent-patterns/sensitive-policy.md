---
type: Agent Pattern
title: Sensitive Email Policy
description: Security gate enforcing manual approval for sensitive categories, low confidence, or safety keywords.
tags: [security, policy, sensitive, approvals, agent]
timestamp: 2026-07-21T22:07:26Z
---

# Sensitive policy (agentic-inbox)

Anchor: `apps/api/src/Modules/Actions/Policy.ts`. Product rule: **never auto-action sensitive mail**.

## Gate

`isSensitive({ category, confidence, emailBody })` is true when any of:

1. Category ∈ `SENSITIVE_CATEGORIES` (`financial`, `dispute`, `safety`, `escalation`)
2. `confidence < MIN_AUTO_CONFIDENCE` (0.75)
3. Raw body hits dollar / legal / safety / escalation keyword lists

Body signals use **raw email text** so a prompt-injected category cannot bypass the gate.

## Downstream

- Decision `isSensitive` stamped after policy (agent normalizes model output).
- Triage toolkit: `makeTriageToolkit(isSensitive)` → `send_reply` / `archive` `needsApproval` when sensitive (`Toolkit.ts`).
- Non-sensitive may auto-execute; sensitive pauses → `ConversationsRepo` + approval HTTP.
- `flag_for_review` is the no-commit fallback.

## Avoid

Auto-exec paths when `isSensitive` is true; weakening keyword lists without regression tests;
prompts that tell the model to send/commit on sensitive categories.
