'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  ListFilterIcon,
  MessageSquareIcon,
  XIcon
} from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import {
  Collapsible,
  CollapsibleAnimatedContent,
  CollapsibleTrigger
} from '@/design-system/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/design-system/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/design-system/components/ui/dropdown-menu';
import { ItemGroup } from '@/design-system/components/ui/item';
import {
  SORT_KEYS,
  SORT_LABELS,
  type SortKey,
  toSortKey
} from '@/lib/inbox/sort';
import type { InboxItem } from '@/lib/inbox/types';
import { EmailRow } from './email-row';
import type { InboxFilters } from './filters';
import { sectionInbox } from './ordering';

const PINNED_APPROVAL_CAP = 5;

type InboxListProps = {
  readonly items: readonly InboxItem[];
  readonly filters: InboxFilters;
  readonly sortKey: SortKey;
  readonly selectedEmailId: string | null;
  readonly viewedEmailIds: ReadonlySet<string>;
  readonly hasSelection: boolean;
  readonly onSelect: (emailId: string) => void;
  readonly onApprove: (approvalId: string) => void;
  readonly onDeny: (approvalId: string) => void;
  readonly onUndo: (ledgerEntryId: string, emailId: string) => void;
  readonly onRetriage: (emailId: string) => void;
  readonly onFiltersChange: (filters: InboxFilters) => void;
  readonly onClearSelection: () => void;
  readonly onToggleChat: () => void;
  readonly onSortChange?: (key: SortKey) => void;
};

type SortMenuProps = {
  readonly sortKey: SortKey;
  readonly onSortChange: (key: SortKey) => void;
};

/** Compact sort-order menu anchored in the list column. */
function SortMenu({ sortKey, onSortChange }: SortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-7 gap-1.5 px-2 text-muted-foreground text-xs"
            size="sm"
            variant="ghost"
          >
            <ListFilterIcon className="size-3.5" />
            {SORT_LABELS[sortKey]}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          onValueChange={(value) => onSortChange(toSortKey(value))}
          value={sortKey}
        >
          {SORT_KEYS.map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {SORT_LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CollapsibleSectionProps = {
  readonly label: string;
  readonly children: ReactNode;
};

/**
 * Sticky, collapsible section: a header that toggles its rows open or closed.
 * Session-local open state; keeps the sticky header and its fade-under gradient.
 *
 * @param label - Section heading text.
 * @param children - Rows revealed when the section is open.
 * @returns The collapsible section.
 */
function CollapsibleSection({ label, children }: CollapsibleSectionProps) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="group sticky top-0 z-10 flex w-full items-center gap-1.5 bg-background/95 px-4 pt-4 pb-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide backdrop-blur outline-none transition-colors hover:text-foreground focus-visible:text-foreground after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-background after:to-transparent sm:px-6">
        <ChevronDownIcon className="size-3.5 shrink-0 transition-transform group-data-[panel-open]:rotate-0 -rotate-90" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleAnimatedContent contentClassName="pt-1">
        {children}
      </CollapsibleAnimatedContent>
    </Collapsible>
  );
}

/**
 * Filterable email list, grouped into pending-approval, triaged, and untriaged
 * sections. Pending approvals are pinned on top, severity-sorted, capped at
 * five rows behind an expander so a large approval batch never walls off the
 * rest of the inbox. Untriaged items (no decision) render quietly at the bottom
 * so a pre-triage inbox reads as unprocessed rather than flagged.
 *
 * @param items - All inbox items, triaged or not.
 * @param filters - Active status/project/category/severity filters.
 * @param sortKey - Active sort order applied within each section.
 * @param selectedEmailId - The open detail selection, or null.
 * @param viewedEmailIds - Emails the reviewer has already opened this session.
 * @param hasSelection - Whether an email is currently selected, gating the background "Clear selection" item.
 * @param onSelect - Called with an email id when a row is activated.
 * @param onApprove - Called with an approval id to approve inline.
 * @param onDeny - Called with an approval id to deny inline.
 * @param onUndo - Called with a ledger entry id and email id to undo a row's in-effect action.
 * @param onRetriage - Called with an email id to re-run the agent on just that email.
 * @param onFiltersChange - Called with the next filters from a row's "Filter by" submenu.
 * @param onClearSelection - Called to clear the current selection from the background menu.
 * @param onToggleChat - Called to toggle the chat panel from the background menu.
 * @param onSortChange - Called with the next sort order; omit to hide the sort control.
 * @returns The sectioned, filtered email list.
 */
export function InboxList({
  items,
  filters,
  sortKey,
  selectedEmailId,
  viewedEmailIds,
  hasSelection,
  onSelect,
  onApprove,
  onDeny,
  onUndo,
  onRetriage,
  onFiltersChange,
  onClearSelection,
  onToggleChat,
  onSortChange
}: InboxListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { pending, triaged, untriaged } = useMemo(
    () => sectionInbox(items, filters, sortKey),
    [items, filters, sortKey]
  );

  const filteredCount = pending.length + triaged.length + untriaged.length;

  const visiblePending = isExpanded
    ? pending
    : pending.slice(0, PINNED_APPROVAL_CAP);
  const hiddenCount = pending.length - visiblePending.length;

  const renderRow = (item: InboxItem) => (
    <EmailRow
      filters={filters}
      isSelected={selectedEmailId === item.email.id}
      isDimmed={
        viewedEmailIds.has(item.email.id) ||
        item.decision === null ||
        item.status !== 'needs_attention'
      }
      item={item}
      key={item.email.id}
      onApprove={onApprove}
      onDeny={onDeny}
      onFiltersChange={onFiltersChange}
      onRetriage={onRetriage}
      onSelect={onSelect}
      onUndo={onUndo}
    />
  );

  const backgroundMenu = (
    <ContextMenuContent>
      {hasSelection ? (
        <>
          <ContextMenuItem onClick={onClearSelection}>
            <XIcon />
            Clear selection
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      ) : null}
      <ContextMenuItem onClick={onToggleChat}>
        <MessageSquareIcon />
        Toggle chat panel
      </ContextMenuItem>
      <ContextMenuItem render={<Link href="/audit" />}>
        <ExternalLinkIcon />
        Go to Audit
      </ContextMenuItem>
    </ContextMenuContent>
  );

  if (filteredCount === 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <div className="flex h-full items-center justify-center px-6 text-muted-foreground text-sm" />
          }
        >
          No emails match these filters.
        </ContextMenuTrigger>
        {backgroundMenu}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={<div className="flex min-h-full flex-col pb-8" />}
      >
        {onSortChange ? (
          <div className="hidden items-center justify-end px-4 pt-2 sm:px-6 md:flex">
            <SortMenu onSortChange={onSortChange} sortKey={sortKey} />
          </div>
        ) : (
          <div className="pt-2" />
        )}
        {pending.length > 0 ? (
          <CollapsibleSection label="Awaiting your approval">
            <ItemGroup className="gap-0 divide-y divide-border/70 px-0">
              {visiblePending.map(renderRow)}
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
          </CollapsibleSection>
        ) : null}
        {triaged.length > 0 ? (
          <CollapsibleSection label="Inbox">
            <ItemGroup className="gap-0 divide-y divide-border/70 px-0">
              {triaged.map(renderRow)}
            </ItemGroup>
          </CollapsibleSection>
        ) : null}
        {untriaged.length > 0 ? (
          <CollapsibleSection label="Not triaged yet">
            <ItemGroup className="gap-0 divide-y divide-border/70 px-0">
              {untriaged.map(renderRow)}
            </ItemGroup>
          </CollapsibleSection>
        ) : null}
      </ContextMenuTrigger>
      {backgroundMenu}
    </ContextMenu>
  );
}
