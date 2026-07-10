import { Schema } from 'effect';
import { EmailId } from '../Emails/Domain';

/** Triage bucket the agent assigned to an email. */
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
/** Agent confidence in its own decision, from 0 (guess) to 1 (certain). */
export const Confidence: Schema.Number = Schema.Number.annotate({
  identifier: 'Confidence',
  description: 'Model confidence in the decision, between 0 and 1 inclusive.'
});

/** One-line reason shown in the list row (soft cap 65 characters). */
export const WhyPreview: Schema.String = Schema.String.annotate({
  identifier: 'WhyPreview',
  description: 'At-a-glance rationale for the list row, at most 65 characters.'
});

/** The agent's structured verdict for a single email. */
export class Decision extends Schema.Class<Decision>('Decision')({
  emailId: EmailId,
  category: Category,
  severity: Severity,
  confidence: Confidence,
  whyPreview: WhyPreview,
  rationale: Schema.String.annotate({
    description:
      'Full plain-language explanation of the decision, rendered as markdown.'
  }),
  keyFacts: Schema.Array(Schema.String).annotate({
    description:
      'Extracted salient facts the reviewer should see (amounts, dates, parties).'
  }),
  isSensitive: Schema.Boolean.annotate({
    description:
      'Whether the policy classifies this email as sensitive (never auto-actioned).'
  })
}) {}

/** Request body for a triage run. */
export class TriageRunRequest extends Schema.Class<TriageRunRequest>(
  'TriageRunRequest'
)({
  fresh: Schema.optional(Schema.Boolean).annotate({
    description:
      'When true, clear all prior decisions, actions, and triage conversations, then re-triage every email.'
  })
}) {}
