import type { Category } from '@app/api-core/Modules/Triage/Domain';
import type { Schema } from 'effect';

/** Categories that are always sensitive and can never be auto-actioned. */
export const SENSITIVE_CATEGORIES: ReadonlySet<
  Schema.Schema.Type<typeof Category>
> = new Set(['change_order', 'claim_dispute', 'safety', 'owner_escalation']);

/** Confidence at or below this is too low to auto-execute. */
export const MIN_AUTO_CONFIDENCE = 0.75;

/** Legal / commitment keywords that force human review when found in an email body. */
export const LEGAL_KEYWORDS: ReadonlyArray<string> = [
  'claim',
  'dispute',
  'lawsuit',
  'litigation',
  'attorney',
  'liability',
  'breach',
  'terminate',
  'termination',
  'penalty',
  'damages',
  'indemnif',
  'lien',
  'change order',
  'delay claim',
  'back charge',
  'backcharge'
];

/** Matches a dollar amount such as `$12,500`, `$1.2M`, or `$500k`. */
const DOLLAR_AMOUNT = /\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|b|million|billion)?/i;

/** Inputs the policy inspects: the model's category/confidence and the RAW email body. */
export type PolicyInput = {
  readonly category: Schema.Schema.Type<typeof Category>;
  readonly confidence: number;
  readonly emailBody: string;
};

/** Whether the RAW email body carries a dollar amount. */
const hasDollarSignal = (body: string): boolean => DOLLAR_AMOUNT.test(body);

/** Whether the RAW email body contains any legal/commitment keyword. */
const hasLegalSignal = (body: string): boolean => {
  const lower = body.toLowerCase();
  return LEGAL_KEYWORDS.some((keyword) => lower.includes(keyword));
};

/**
 * Whether an email must be routed to a human rather than auto-actioned.
 *
 * Sensitive when the model's category is inherently sensitive, when the RAW
 * email body carries a dollar or legal signal, or when model confidence is
 * below the auto-execute threshold. Body signals are matched against the raw
 * text so a prompt-injected email cannot classify its way past the gate.
 *
 * @param input - The model category and confidence plus the raw email body.
 * @returns True when human approval is required; false when auto-execution is allowed.
 */
export const isSensitive = (input: PolicyInput): boolean => {
  if (SENSITIVE_CATEGORIES.has(input.category)) {
    return true;
  }
  if (input.confidence < MIN_AUTO_CONFIDENCE) {
    return true;
  }
  if (hasDollarSignal(input.emailBody)) {
    return true;
  }
  if (hasLegalSignal(input.emailBody)) {
    return true;
  }
  return false;
};
