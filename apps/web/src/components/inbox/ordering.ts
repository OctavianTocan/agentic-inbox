import { comparatorFor, type SortKey } from '@/lib/inbox/sort';
import type { InboxItem } from '@/lib/inbox/types';
import { type InboxFilters, matchesFilters } from './filters';

/** The three fixed inbox sections, each sorted by the active order. */
export type InboxSections = {
  readonly pending: readonly InboxItem[];
  readonly triaged: readonly InboxItem[];
  readonly untriaged: readonly InboxItem[];
};

/**
 * Split the filtered inbox into its fixed sections, sorting rows within each
 * section by the active order. The section order never changes; only the rows
 * inside reorder.
 *
 * @param items - All inbox items, triaged or not.
 * @param filters - Active status/project/category/severity filters.
 * @param sortKey - Active sort order applied within each section.
 * @returns The pending-approval, triaged, and untriaged sections.
 */
export function sectionInbox(
  items: readonly InboxItem[],
  filters: InboxFilters,
  sortKey: SortKey
): InboxSections {
  const compare = comparatorFor(sortKey);
  const filtered = items.filter((item) => matchesFilters(item, filters));
  return {
    pending: filtered
      .filter((item) => item.pendingApproval !== null)
      .sort(compare),
    triaged: filtered
      .filter(
        (item) => item.pendingApproval === null && item.classification !== null
      )
      .sort(compare),
    untriaged: filtered
      .filter((item) => item.classification === null)
      .sort(compare)
  };
}

/**
 * Flatten the sectioned inbox into the exact row order rendered in the list, so
 * keyboard navigation walks rows in the same order they appear on screen.
 *
 * @param items - All inbox items, triaged or not.
 * @param filters - Active status/project/category/severity filters.
 * @param sortKey - Active sort order applied within each section.
 * @returns The flattened, render-ordered item list.
 */
export function orderedItems(
  items: readonly InboxItem[],
  filters: InboxFilters,
  sortKey: SortKey
): readonly InboxItem[] {
  const { pending, triaged, untriaged } = sectionInbox(items, filters, sortKey);
  return [...pending, ...triaged, ...untriaged];
}
