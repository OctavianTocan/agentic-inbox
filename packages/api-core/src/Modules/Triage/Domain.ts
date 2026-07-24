import { Schema } from 'effect';
import { EmailId } from '../Emails/Domain';

/** Triage bucket the agent assigned to an email. */
// TODO: This should probably be renamed, now that we're also classifying by policy, and that also has 'categories'.
export const Category: Schema.Literals<
  readonly [
    'request',
    'activity_update',
    'document_review',
    'supplier_update',
    'schedule',
    'status_update',
    'financial',
    'dispute',
    'safety',
    'escalation',
    'other'
  ]
> = Schema.Literals([
  'request',
  'activity_update',
  'document_review',
  'supplier_update',
  'schedule',
  'status_update',
  'financial',
  'dispute',
  'safety',
  'escalation',
  'other'
]).annotate({
  identifier: 'Category',
  description:
    'Email category. The last four (financial, dispute, safety, escalation) are always sensitive.'
});

/** Next action the agent proposes for the email. */
export const NextAction: Schema.Literals<
  readonly ['send_reply', 'archive', 'flag_for_review', 'no_action']
> = Schema.Literals([
  'send_reply',
  'archive',
  'flag_for_review',
  'no_action'
]).annotate({
  identifier: 'NextAction',
  description: 'Action the agent proposes to take for the email.'
});

// TODO: Why is 'sensitive_category' a 'category'?
/** Policy category applied to the classification, if any. */
export const PolicyCategory: Schema.Literals<
  readonly [
    'sesitive_category',
    'low_confidence',
    'dollar_signal',
    'legal_keyword',
    'safety_keyword',
    'escalation_keyword'
  ]
> = Schema.Literals([
  'sesitive_category',
  'low_confidence',
  'dollar_signal',
  'legal_keyword',
  'safety_keyword',
  'escalation_keyword'
]).annotate({
  identifier: 'PolicyCategory',
  description: 'Policy category applied to the classification, if any.'
});

/** How urgent or consequential the email is. */
export const Severity: Schema.Literals<
  readonly ['low', 'medium', 'high', 'critical']
> = Schema.Literals(['low', 'medium', 'high', 'critical']).annotate({
  identifier: 'Severity',
  description: 'Urgency of the email, from low to critical.'
});

// Deliberately unrefined: gpt-5.5 strict structured output rejects schemas
// carrying check filters ("Expected <filter>"); bounds are enforced in code
// after decode (see docs/SPIKE-NOTES.md finding 1).
/** Agent confidence in its own classification, from 0 (guess) to 1 (certain). */
export const Confidence: Schema.Number = Schema.Number.annotate({
  identifier: 'Confidence',
  description:
    'Model confidence in the classification, between 0 and 1 inclusive.'
});

/** One-line reason shown in the list row (soft cap 65 characters). */
export const WhyPreview: Schema.String = Schema.String.annotate({
  identifier: 'WhyPreview',
  description: 'At-a-glance rationale for the list row, at most 65 characters.'
});

/** Reasons the policy applied to the classification. */
export const PolicyReasons = Schema.Array(Schema.String).annotate({
  identifier: 'PolicyReasons',
  description: 'Reasons the policy applied to the classification, if any.'
});

/** The agent's structured verdict for a single email. */
export class Classification extends Schema.Class<Classification>(
  'Classification'
)({
  emailId: EmailId,
  category: Category,
  severity: Severity,
  confidence: Confidence,
  whyPreview: WhyPreview,
  rationale: Schema.String.annotate({
    description:
      'Full plain-language explanation of the classification, rendered as markdown.'
  }),
  keyFacts: Schema.Array(Schema.String).annotate({
    description:
      'Extracted salient facts the reviewer should see (amounts, dates, parties).'
  }),
  isSensitive: Schema.Boolean.annotate({
    description:
      'Whether the policy classifies this email as sensitive (never auto-actioned).'
  }),
  policyReasons: PolicyReasons
}) {}

/** Request body for a batch triage run (HTTP). */
export class TriageRunRequest extends Schema.Class<TriageRunRequest>(
  'TriageRunRequest'
)({
  fresh: Schema.optional(Schema.Boolean).annotate({
    description:
      'When true, clear all prior classifications, actions, and triage conversations, then re-triage every email.'
  })
}) {}
