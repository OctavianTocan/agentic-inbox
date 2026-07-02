'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/design-system/components/ui/button';
import { ItemGroup } from '@/design-system/components/ui/item';
import { bySeverityDesc } from '@/lib/inbox/labels';
import type { InboxItem } from '@/lib/inbox/types';
import { EmailRow } from './email-row';
import type { InboxFilters } from './filters';
import { matchesFilters } from './filters';

const PINNED_APPROVAL_CAP = 5;

type InboxListProps = {
  readonly items: readonly InboxItem[];
  readonly filters: InboxFilters;
  readonly selectedEmailId: string | null;
  readonly viewedEmailIds: ReadonlySet<string>;
  readonly onSelect: (emailId: string) => void;
  readonly onApprove: (approvalId: string) => void;
  readonly onDeny: (approvalId: string) => void;
};

type SectionLabelProps = {
  readonly children: string;
};

/** Sticky section heading within the list. */
function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 px-4 pt-4 pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide backdrop-blur sm:px-6">
      {children}
    </div>
  );
}

/**
 * Filterable email list. Pending approvals are pinned on top, severity-sorted,
 * capped at five rows behind an expander so a large approval batch never walls
 * off the rest of the inbox.
 *
 * @param items - All triaged inbox items.
 * @param filters - Active status/project/category/severity filters.
 * @param selectedEmailId - The open detail selection, or null.
 * @param viewedEmailIds - Emails the reviewer has already opened this session.
 * @param onSelect - Called with an email id when a row is activated.
 * @param onApprove - Called with an approval id to approve inline.
 * @param onDeny - Called with an approval id to deny inline.
 * @returns The pinned-approvals section and the filtered remainder.
 */
export function InboxList({
  items,
  filters,
  selectedEmailId,
  viewedEmailIds,
  onSelect,
  onApprove,
  onDeny
}: InboxListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filtered = useMemo(
    () => items.filter((item) => matchesFilters(item, filters)),
    [items, filters]
  );

  const pending = useMemo(
    () =>
      filtered
        .filter((item) => item.pendingApproval !== null)
        .sort(bySeverityDesc),
    [filtered]
  );

  const rest = useMemo(
    () =>
      filtered
        .filter((item) => item.pendingApproval === null)
        .sort(bySeverityDesc),
    [filtered]
  );

  const visiblePending = isExpanded
    ? pending
    : pending.slice(0, PINNED_APPROVAL_CAP);
  const hiddenCount = pending.length - visiblePending.length;

  const rowProps = { selectedEmailId, onSelect, onApprove, onDeny };

  if (filtered.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-muted-foreground text-sm">
        No emails match these filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {pending.length > 0 ? (
        <>
          <SectionLabel>Awaiting your approval</SectionLabel>
          <ItemGroup className="gap-0 divide-y divide-border/70 px-0">
            {visiblePending.map((item) => (
              <EmailRow
                isSelected={selectedEmailId === item.email.id}
                isDimmed={
                  viewedEmailIds.has(item.email.id) ||
                  item.status !== 'needs_attention'
                }
                item={item}
                key={item.email.id}
                onApprove={rowProps.onApprove}
                onDeny={rowProps.onDeny}
                onSelect={rowProps.onSelect}
              />
            ))}
          </ItemGroup>
          {hiddenCount > 0 || isExpanded ? (
            <div className="px-4 pt-2 sm:px-6">
              <Button
                onClick={() => setIsExpanded((prev) => !prev)}
                size="sm"
                variant="ghost"
              >
                {isExpanded ? 'Show fewer' : `${hiddenCount} more approvals`}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      {rest.length > 0 ? (
        <>
          <SectionLabel>Inbox</SectionLabel>
          <ItemGroup className="gap-0 divide-y divide-border/70 px-0">
            {rest.map((item) => (
              <EmailRow
                isSelected={selectedEmailId === item.email.id}
                isDimmed={
                  viewedEmailIds.has(item.email.id) ||
                  item.status !== 'needs_attention'
                }
                item={item}
                key={item.email.id}
                onApprove={rowProps.onApprove}
                onDeny={rowProps.onDeny}
                onSelect={rowProps.onSelect}
              />
            ))}
          </ItemGroup>
        </>
      ) : null}
    </div>
  );
}
