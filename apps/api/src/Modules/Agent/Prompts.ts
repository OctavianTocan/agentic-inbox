import type { Email } from '@app/api-core/Modules/Emails/Domain';
import type { Decision } from '@app/api-core/Modules/Triage/Domain';

/** Builds the strict structured-output prompt for one email. */
export const triageDecisionPrompt = (
  email: Email
): string => `Classify this shared-inbox email.

Return the structured decision only. Do not include an emailId field.
Categories: request, activity_update, document_review, supplier_update, schedule, status_update, financial, dispute, safety, escalation, other.
Sensitive categories are financial, dispute, safety, escalation.
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
- For activity updates and status updates, archive when no reply is needed.
- For routine requests, document reviews, supplier updates, schedule pings, or other routine coordination, send a short plain-text acknowledgement only.
- For a sensitive email that genuinely warrants a response (financial, dispute, or escalation messages that expect a reply), draft that reply with send_reply. It will pause for the user's approval and will never be sent autonomously, so the user gets an editable draft to approve or deny.
- Use flag_for_review only for sensitive or low-confidence email where no reply fits, such as an FYI safety report; it is the fallback when no action is appropriate.
- Never promise financial, schedule, legal, or safety commitments; a sensitive draft proposes wording for the human, it does not commit anything.

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
  'You are a careful shared-inbox agent. Record triage before action. Auto-handle only routine work. For sensitive, disputed, safety, escalated, legal, financial, or low-confidence items, defer to the human. Write plain-text email replies.';

/** System prompt for the interactive inbox assistant. */
export const CHAT_SYSTEM_PROMPT =
  'You are the Agentic Inbox assistant. Answer from the fixed inbox and action ledger using tools. Never fabricate emails, actions, dates, or approvals. Mutating actions must use tools and may pause for approval.';
