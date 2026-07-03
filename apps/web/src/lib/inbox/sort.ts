import { bySeverityDesc, senderName } from './labels';
import type { InboxItem } from './types';

export type SortKey = 'severity' | 'newest' | 'oldest' | 'sender';

/** Menu label for each sort order, in display order. */
export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  severity: 'Severity',
  newest: 'Newest',
  oldest: 'Oldest',
  sender: 'Sender'
};

/** Sort options in the order the desktop menu lists them. */
export const SORT_KEYS: readonly SortKey[] = [
  'severity',
  'newest',
  'oldest',
  'sender'
];

/**
 * Narrow an arbitrary menu value back to a `SortKey`, falling back to the
 * severity default when the value is not a known sort key.
 *
 * @param value - Raw value emitted by the sort menu.
 * @returns The matching sort key, or `'severity'`.
 */
export function toSortKey(value: unknown): SortKey {
  return SORT_KEYS.find((key) => key === value) ?? 'severity';
}

function byNewest(a: InboxItem, b: InboxItem): number {
  return b.email.timestamp.localeCompare(a.email.timestamp);
}

/**
 * Comparator for the chosen inbox sort order, applied uniformly to the list
 * rows and the keyboard-navigation order so the two never diverge.
 *
 * @param key - The active sort order.
 * @returns A comparator over inbox items for that order.
 */
export function comparatorFor(
  key: SortKey
): (a: InboxItem, b: InboxItem) => number {
  if (key === 'newest') {
    return byNewest;
  }
  if (key === 'oldest') {
    return (a, b) => -byNewest(a, b);
  }
  if (key === 'sender') {
    return (a, b) =>
      senderName(a.email.from).localeCompare(senderName(b.email.from));
  }
  return (a, b) => bySeverityDesc(a, b) || byNewest(a, b);
}
