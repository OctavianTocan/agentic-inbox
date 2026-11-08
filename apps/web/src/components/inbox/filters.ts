import { projectOf } from '@/lib/inbox/labels';
import type {
  Category,
  EmailStatus,
  InboxItem,
  Severity
} from '@/lib/inbox/types';

/** Active sidebar filters; a null facet means "no filter on that axis". */
export type InboxFilters = {
  readonly status: EmailStatus | null;
  readonly project: string | null;
  readonly category: Category | null;
  readonly severity: Severity | null;
};

/** Empty filter set that matches every item. */
export const EMPTY_FILTERS: InboxFilters = {
  status: null,
  project: null,
  category: null,
  severity: null
};

/**
 * Whether an item passes all active filter facets.
 *
 * @param item - Candidate inbox item.
 * @param filters - Active filter facets.
 * @returns True when the item satisfies every non-null facet.
 */
export function matchesFilters(
  item: InboxItem,
  filters: InboxFilters
): boolean {
  if (filters.status !== null && item.status !== filters.status) {
    return false;
  }
  if (
    filters.project !== null &&
    projectOf(item.email.subject) !== filters.project
  ) {
    return false;
  }
  if (
    filters.category !== null &&
    item.decision?.category !== filters.category
  ) {
    return false;
  }
  if (
    filters.severity !== null &&
    item.decision?.severity !== filters.severity
  ) {
    return false;
  }
  return true;
}
