import type {
  ActionKind,
  Category,
  EmailStatus,
  InboxItem,
  Severity
} from './types';

/** Human-readable label for each triage category. */
export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  request: 'Request',
  activity_update: 'Activity update',
  document_review: 'Document review',
  supplier_update: 'Supplier update',
  schedule: 'Schedule',
  status_update: 'Status update',
  financial: 'Financial',
  dispute: 'Dispute',
  safety: 'Safety',
  escalation: 'Escalation',
  other: 'Other'
};

/** Human-readable label for each review status. */
export const STATUS_LABELS: Readonly<Record<EmailStatus, string>> = {
  needs_attention: 'Needs attention',
  done_for_you: 'Done for you',
  filed: 'Filed'
};

/** Human-readable label for each executed action. */
export const ACTION_LABELS: Readonly<Record<ActionKind, string>> = {
  send_reply: 'Sent reply',
  archive: 'Filed',
  flag_for_review: 'Flagged',
  undo: 'Undo'
};

const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0
};

/** Badge variant that renders a severity at the right visual weight. */
export function severityBadgeVariant(
  severity: Severity
): 'attention' | 'secondary' | 'outline' {
  if (severity === 'critical' || severity === 'high') {
    return 'attention';
  }
  if (severity === 'medium') {
    return 'secondary';
  }
  return 'outline';
}

/** Badge variant for a review status. */
export function statusBadgeVariant(
  status: EmailStatus
): 'attention' | 'success' | 'outline' {
  if (status === 'needs_attention') {
    return 'attention';
  }
  if (status === 'done_for_you') {
    return 'success';
  }
  return 'outline';
}

/**
 * Order two items so higher-severity pending approvals sort first.
 *
 * @param a - Left item.
 * @param b - Right item.
 * @returns Negative when `a` should come before `b`, positive otherwise.
 */
export function bySeverityDesc(a: InboxItem, b: InboxItem): number {
  const sa = a.classification ? SEVERITY_RANK[a.classification.severity] : -1;
  const sb = b.classification ? SEVERITY_RANK[b.classification.severity] : -1;
  return sb - sa;
}

/** Best-effort project name inferred from an email subject for grouping chips. */
export function projectOf(subject: string): string {
  const known = [
    'Paper Birch Studio',
    'Workshop Desk',
    'Supplier Updates',
    'Customer Care',
    'Community Events'
  ];
  const match = known.find((name) => subject.includes(name));
  return match ?? 'Other';
}

/** Format an ISO timestamp as a compact local date-time for list rows. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** Sender display name without the trailing angle-bracket address. */
export function senderName(from: string): string {
  const angle = from.indexOf('<');
  return angle > 0 ? from.slice(0, angle).trim() : from;
}
