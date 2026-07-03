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

/**
 * Safety-incident keywords that force human review when found in an email body.
 * A wrong auto-reply to an injury or near-miss report carries legal and human
 * exposure, so these trip the gate even when the model labeled the email routine.
 */
export const SAFETY_KEYWORDS: ReadonlyArray<string> = [
  'injury',
  'injured',
  'injuries',
  'safety incident',
  'incident report',
  'near-miss',
  'near miss',
  'osha',
  'first aid',
  'first-aid',
  'ambulance',
  'paramedic',
  'stand-down',
  'stand down',
  'standdown',
  'unsafe',
  'fall arrest',
  'fall-arrest',
  'fatal',
  'fatality',
  'struck by',
  'struck in',
  'laceration',
  'fracture',
  'concussion',
  'recordable',
  'lost time',
  'lost-time'
];

/**
 * Escalation / litigation-hold keywords that force human review when found in an
 * email body: owner complaints, document-preservation demands, and outside-counsel
 * contact all warrant a human even when the model's category reads routine.
 */
export const ESCALATION_KEYWORDS: ReadonlyArray<string> = [
  'litigation hold',
  'preserve all',
  'preserve documents',
  'preserve records',
  'preserve correspondence',
  'preserve any',
  'counsel',
  'legal action',
  'legal counsel',
  'law llp',
  'law firm',
  'formally register',
  'formal complaint',
  'formal notice',
  'register concerns',
  'cease and desist',
  'notice of default',
  'documentation request',
  'gathering documentation'
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

/** Whether the RAW email body contains any keyword from the given list. */
const hasKeyword = (body: string, keywords: ReadonlyArray<string>): boolean => {
  const lower = body.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
};

/**
 * Whether an email must be routed to a human rather than auto-actioned.
 *
 * Sensitive when the model's category is inherently sensitive, when the RAW
 * email body carries a dollar, legal, safety, or escalation signal, or when
 * model confidence is below the auto-execute threshold. Body signals are matched
 * against the raw text so a prompt-injected email cannot classify its way past
 * the gate, and so injury/near-miss/litigation-hold mail is caught by code even
 * if the model mislabels its category.
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
  if (hasKeyword(input.emailBody, LEGAL_KEYWORDS)) {
    return true;
  }
  if (hasKeyword(input.emailBody, SAFETY_KEYWORDS)) {
    return true;
  }
  if (hasKeyword(input.emailBody, ESCALATION_KEYWORDS)) {
    return true;
  }
  return false;
};
