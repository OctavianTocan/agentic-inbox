import type { Email } from '@app/api-core/Modules/Emails/Domain';
import type { Decision } from '@app/api-core/Modules/Triage/Domain';

const sensitiveCategories = new Set([
  'change_order',
  'claim_dispute',
  'safety',
  'owner_escalation'
]);

const dollarAmountPattern =
  /\$\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*\s?(?:usd|dollars?)\b/i;
const legalKeywordPattern =
  /\b(claim|dispute|lawsuit|legal|attorney|counsel|liable|liability|breach|default|osha|injury|incident|change order|backcharge|liquidated damages|notice to cure)\b/i;
const confidenceThreshold = 0.78;

/** Returns true when deterministic policy requires human approval before action. */
export function requiresApproval(email: Email, decision: Decision): boolean {
  if (sensitiveCategories.has(decision.category)) {
    return true;
  }

  if (dollarAmountPattern.test(email.body)) {
    return true;
  }

  if (legalKeywordPattern.test(email.body)) {
    return true;
  }

  return decision.confidence < confidenceThreshold;
}

/** Returns true when the decision category is one of the always-sensitive buckets. */
export function isSensitiveCategory(decision: Decision): boolean {
  return sensitiveCategories.has(decision.category);
}
