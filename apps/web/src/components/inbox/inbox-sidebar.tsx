'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  FilterXIcon,
  HistoryIcon,
  InboxIcon
} from '@/design-system/components/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarResizeHandle
} from '@/design-system/components/ui/sidebar';
import { CATEGORY_LABELS, projectOf, STATUS_LABELS } from '@/lib/inbox/labels';
import type {
  Category,
  EmailStatus,
  InboxItem,
  LedgerEntry,
  Severity
} from '@/lib/inbox/types';
import { EMPTY_FILTERS, type InboxFilters } from './filters';

const STATUSES: readonly EmailStatus[] = [
  'needs_attention',
  'done_for_you',
  'filed'
];
const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

type InboxSidebarProps = {
  readonly items: readonly InboxItem[];
  readonly ledger: readonly LedgerEntry[];
  readonly filters: InboxFilters;
  readonly onFiltersChange: (filters: InboxFilters) => void;
};

type FacetRowProps<T extends string> = {
  readonly label: string;
  readonly values: readonly T[];
  readonly active: T | null;
  readonly display: (value: T) => string;
  readonly count: (value: T) => number;
  readonly onToggle: (value: T | null) => void;
};

/** One filter facet rendered as a toggle group of sidebar menu buttons. */
function FacetRow<T extends string>({
  label,
  values,
  active,
  display,
  count,
  onToggle
}: FacetRowProps<T>) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {values.map((value) => (
            <SidebarMenuItem key={value}>
              <SidebarMenuButton
                isActive={active === value}
                onClick={() => onToggle(active === value ? null : value)}
              >
                <span>{display(value)}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>{count(value)}</SidebarMenuBadge>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** Count rows matching a facet value. */
function countBy<T extends string>(
  items: readonly InboxItem[],
  value: T,
  getValue: (item: InboxItem) => T | null
): number {
  return items.filter((item) => getValue(item) === value).length;
}

/**
 * Left mailbox rail: status/project/category/severity filters over the inbox
 * plus one navigation row for the full agent trace view.
 *
 * @param items - Triaged items, used to derive the project facet.
 * @param ledger - Ledger entries used for the trace count.
 * @param filters - Active filter facets.
 * @param onFiltersChange - Called with the next filter set on any toggle.
 * @returns The sidebar.
 */
export function InboxSidebar({
  items,
  ledger,
  filters,
  onFiltersChange
}: InboxSidebarProps) {
  const projects = useMemo(() => {
    const names = new Set(items.map((item) => projectOf(item.email.subject)));
    return [...names].sort();
  }, [items]);

  const categories = useMemo(() => {
    const present = new Set<Category>();
    for (const item of items) {
      if (item.decision) {
        present.add(item.decision.category);
      }
    }
    return [...present];
  }, [items]);

  const hasActiveFilter =
    filters.status !== null ||
    filters.project !== null ||
    filters.category !== null ||
    filters.severity !== null;

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="gap-2 px-3 py-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <InboxIcon className="size-4" />
          Agentic Inbox
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive>
              <InboxIcon className="size-4" />
              <span>Inbox</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>{items.length}</SidebarMenuBadge>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/traces" />}>
              <HistoryIcon className="size-4" />
              <span>Agent traces</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>{ledger.length}</SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
        {hasActiveFilter ? (
          <SidebarMenuButton
            className="mt-1 h-7 text-muted-foreground text-xs"
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
          >
            <FilterXIcon className="size-3.5" />
            Clear filters
          </SidebarMenuButton>
        ) : null}
      </SidebarHeader>
      <SidebarContent>
        <FacetRow
          active={filters.status}
          count={(status) => countBy(items, status, (item) => item.status)}
          display={(value) => STATUS_LABELS[value]}
          label="Status"
          onToggle={(status) => onFiltersChange({ ...filters, status })}
          values={STATUSES}
        />
        <FacetRow
          active={filters.severity}
          count={(severity) =>
            countBy(items, severity, (item) => item.decision?.severity ?? null)
          }
          display={(value) => value}
          label="Severity"
          onToggle={(severity) => onFiltersChange({ ...filters, severity })}
          values={SEVERITIES}
        />
        <FacetRow
          active={filters.project}
          count={(project) =>
            countBy(items, project, (item) => projectOf(item.email.subject))
          }
          display={(value) => value}
          label="Project"
          onToggle={(project) => onFiltersChange({ ...filters, project })}
          values={projects}
        />
        {categories.length > 0 ? (
          <FacetRow
            active={filters.category}
            count={(category) =>
              countBy(
                items,
                category,
                (item) => item.decision?.category ?? null
              )
            }
            display={(value) => CATEGORY_LABELS[value]}
            label="Category"
            onToggle={(category) => onFiltersChange({ ...filters, category })}
            values={categories}
          />
        ) : null}
      </SidebarContent>
      <SidebarResizeHandle />
    </Sidebar>
  );
}
