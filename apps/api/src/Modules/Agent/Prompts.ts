import type { Email } from '@app/api-core/Modules/Emails/Domain';
import type { Decision } from '@app/api-core/Modules/Triage/Domain';

/** Builds the strict structured-output prompt for one email. */
export const triageDecisionPrompt = (
  email: Email
): string => `Classify this AEC project email for a PM inbox.

Return the structured decision only. Categories: rfi, daily_report, submittal, vendor_quote, schedule, status_update, change_order, claim_dispute, safety, owner_escalation, other.
Sensitive categories are change_order, claim_dispute, safety, owner_escalation.
Keep whyPreview at 65 characters or less.

Email:
id: ${email.id}
from: ${email.from}
to: ${email.to.join(', ')}
cc: ${email.cc.join(', ')}
timestamp: ${email.timestamp}
subject: ${email.subject}
body:
${email.body}`;

/** Builds the tool-loop prompt for one email after structured triage. */
export const triageActionPrompt = (
  email: Email,
  decision: Decision
): string => `Process this one email using tools.

Rules:
- Call record_triage first with the exact decision below.
- Then choose one next action.
- For daily reports and status updates, archive when no reply is needed.
- For routine RFIs, submittals, vendor quotes, schedule pings, or other routine coordination, send a short plain-text acknowledgement only.
- For a sensitive email that genuinely warrants a response (change orders, claims or disputes, owner escalations that expect a reply), draft that reply with send_reply. It will pause for the user's approval and will never be sent autonomously, so the user gets an editable draft to approve or deny.
- Use flag_for_review only for sensitive or low-confidence email where no reply fits, such as an FYI safety report; it is the fallback when no action is appropriate.
- Never promise cost, schedule, legal, safety, or owner commitments; a sensitive draft proposes wording for the human, it does not commit anything.

Decision:
emailId: ${decision.emailId}
category: ${decision.category}
severity: ${decision.severity}
confidence: ${decision.confidence}
whyPreview: ${decision.whyPreview}
rationale: ${decision.rationale}
isSensitive: ${decision.isSensitive}
keyFacts:
${decision.keyFacts.map((fact) => `- ${fact}`).join('\n')}

Email:
subject: ${email.subject}
body:
${email.body}`;

/** System prompt for the batch triage agent. */
export const TRIAGE_SYSTEM_PROMPT =
  'You are a careful construction project inbox agent. Record triage before action. Auto-handle only routine work. For sensitive, disputed, safety, owner, legal, money, or low-confidence items, defer to the human. Write plain-text email replies.';

/** System prompt for the interactive inbox assistant. */
export const CHAT_SYSTEM_PROMPT =
  'You are the Cogram inbox assistant. Answer from the fixed inbox and action ledger using tools. Never fabricate emails, actions, dates, or approvals. Mutating actions must use tools and may pause for approval.';
