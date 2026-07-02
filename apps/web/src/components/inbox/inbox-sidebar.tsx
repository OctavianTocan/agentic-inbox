'use client';

import { useMemo } from 'react';
import {
  ArchiveIcon,
  BanIcon,
  FilterXIcon,
  InboxIcon,
  RotateCcwIcon,
  SendIcon
} from '@/design-system/components/icons';
import { StaticTraceStep, Trace } from '@/design-system/components/ui/ai/trace';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/design-system/components/ui/sidebar';
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  formatTimestamp,
  projectOf,
  STATUS_LABELS
} from '@/lib/inbox/labels';
import type {
  ActionKind,
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

const ACTION_ICON: Readonly<Record<ActionKind, typeof SendIcon>> = {
  send_reply: SendIcon,
  archive: ArchiveIcon,
  flag_for_review: FilterXIcon,
  undo: RotateCcwIcon
};

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
  readonly onToggle: (value: T | null) => void;
};

/** One filter facet rendered as a toggle group of sidebar menu buttons. */
function FacetRow<T extends string>({
  label,
  values,
  active,
  display,
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
                {display(value)}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Left panel: status/project/category/severity filters over the inbox plus an
 * Agent Trace timeline built from the action ledger.
 *
 * @param items - Triaged items, used to derive the project facet.
 * @param ledger - Ledger entries newest-first for the trace timeline.
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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-1 px-3 py-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <InboxIcon className="size-4" />
          Agentic Inbox
        </div>
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
          display={(value) => STATUS_LABELS[value]}
          label="Status"
          onToggle={(status) => onFiltersChange({ ...filters, status })}
          values={STATUSES}
        />
        <FacetRow
          active={filters.severity}
          display={(value) => value}
          label="Severity"
          onToggle={(severity) => onFiltersChange({ ...filters, severity })}
          values={SEVERITIES}
        />
        <FacetRow
          active={filters.project}
          display={(value) => value}
          label="Project"
          onToggle={(project) => onFiltersChange({ ...filters, project })}
          values={projects}
        />
        {categories.length > 0 ? (
          <FacetRow
            active={filters.category}
            display={(value) => CATEGORY_LABELS[value]}
            label="Category"
            onToggle={(category) => onFiltersChange({ ...filters, category })}
            values={categories}
          />
        ) : null}
        <SidebarGroup>
          <SidebarGroupLabel>Agent trace</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            {ledger.length === 0 ? (
              <p className="px-1 text-muted-foreground text-xs">
                No actions yet.
              </p>
            ) : (
              <Trace>
                {ledger.map((entry) => {
                  const Icon = ACTION_ICON[entry.action] ?? BanIcon;
                  return (
                    <StaticTraceStep key={entry.id}>
                      <div className="flex items-start gap-2 py-0.5">
                        <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-foreground text-xs">
                            {entry.summary}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {ACTION_LABELS[entry.action]} ·{' '}
                            {formatTimestamp(entry.createdAt)}
                          </span>
                        </div>
                      </div>
                    </StaticTraceStep>
                  );
                })}
              </Trace>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
