'use client';

import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  FilterXIcon,
  HistoryIcon,
  InboxIcon,
  ListFilterIcon,
  RefreshCwIcon,
  UserIcon
} from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/design-system/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/design-system/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarResizeHandle,
  useSidebar
} from '@/design-system/components/ui/sidebar';
import { useIsMobile } from '@/design-system/hooks/use-mobile';
import { cn } from '@/design-system/lib/utils';
import { CATEGORY_LABELS, projectOf, STATUS_LABELS } from '@/lib/inbox/labels';
import type {
  Category,
  EmailStatus,
  InboxItem,
  LedgerEntry,
  Severity
} from '@/lib/inbox/types';
import { EMPTY_FILTERS, type InboxFilters } from './filters';
import { SidebarHeaderSlice } from './top-bar';

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
  readonly activeSection?: 'inbox' | 'audit';
  readonly showFilters?: boolean;
  readonly headerPeek?: ReactNode;
  readonly onRunAgent?: () => void;
};

type FilterMeta = {
  readonly projects: readonly string[];
  readonly categories: readonly Category[];
  readonly activeCount: number;
};

type SidebarMetric = {
  readonly label: string;
  readonly value: number;
  readonly filters: InboxFilters;
  readonly isActive: boolean;
};

type FacetMenuProps<T extends string> = {
  readonly label: string;
  readonly values: readonly T[];
  readonly active: T | null;
  readonly display: (value: T) => string;
  readonly count: (value: T) => number;
  readonly onToggle: (value: T | null) => void;
};

/** Count rows matching a facet value. */
function countBy<T extends string>(
  items: readonly InboxItem[],
  value: T,
  getValue: (item: InboxItem) => T | null
): number {
  return items.filter((item) => getValue(item) === value).length;
}

/** Number of filter facets currently applied. */
function activeFilterCount(filters: InboxFilters): number {
  return [
    filters.status,
    filters.severity,
    filters.project,
    filters.category
  ].filter(Boolean).length;
}

/** Derived filter options from the currently loaded inbox data. */
function filterMeta(
  items: readonly InboxItem[],
  filters: InboxFilters
): FilterMeta {
  const projects = new Set(items.map((item) => projectOf(item.email.subject)));
  const categories = new Set<Category>();
  for (const item of items) {
    if (item.decision) {
      categories.add(item.decision.category);
    }
  }
  return {
    projects: [...projects].sort(),
    categories: [...categories],
    activeCount: activeFilterCount(filters)
  };
}

/** Compact queue status rows for the desktop sidebar. */
function queueMetrics(
  items: readonly InboxItem[],
  filters: InboxFilters
): readonly SidebarMetric[] {
  return STATUSES.map((status) => ({
    label: STATUS_LABELS[status],
    value: countBy(items, status, (item) => item.status),
    filters: { ...filters, status },
    isActive: filters.status === status
  }));
}

/** Busiest projects for the desktop sidebar summary. */
function projectMetrics(
  items: readonly InboxItem[],
  filters: InboxFilters
): readonly SidebarMetric[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const project = projectOf(item.email.subject);
    counts.set(project, (counts.get(project) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([label, value]) => ({
      label,
      value,
      filters: { ...filters, project: label },
      isActive: filters.project === label
    }));
}

type SidebarMetricSectionProps = {
  readonly label: string;
  readonly metrics: readonly SidebarMetric[];
  readonly onFiltersChange: (filters: InboxFilters) => void;
};

/** Short labelled metric list inside the desktop mailbox rail. */
function SidebarMetricSection({
  label,
  metrics,
  onFiltersChange
}: SidebarMetricSectionProps) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </h3>
      <div className="grid gap-0.5">
        {metrics.map((metric) => (
          <Button
            className={cn(
              'h-7 w-full justify-between px-2 hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden',
              metric.isActive && 'bg-sidebar-accent-active'
            )}
            key={metric.label}
            onClick={() => onFiltersChange(metric.filters)}
            size="sm"
            variant="ghost"
          >
            <span className="min-w-0 truncate">{metric.label}</span>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
              {metric.value}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}

/** One dropdown submenu for a filter facet. */
function FacetMenu<T extends string>({
  label,
  values,
  active,
  display,
  count,
  onToggle
}: FacetMenuProps<T>) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span>{label}</span>
        {active ? (
          <span className="ml-auto max-w-24 truncate text-muted-foreground text-xs">
            {display(active)}
          </span>
        ) : null}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-52">
        {values.map((value) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onToggle(active === value ? null : value)}
          >
            <span>{display(value)}</span>
            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
              {count(value)}
            </span>
            {active === value ? <CheckIcon className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/** Compact desktop filter menu used from the left navigation rail. */
export function InboxFilterMenu({
  items,
  filters,
  onFiltersChange
}: Omit<InboxSidebarProps, 'ledger'>) {
  const meta = useMemo(() => filterMeta(items, filters), [items, filters]);
  const hasActiveFilter = meta.activeCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-9 w-full justify-between px-2 hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground aria-expanded:bg-sidebar-accent-hover aria-expanded:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2!"
            size="sm"
            variant="outline"
          />
        }
      >
        <span className="flex items-center gap-2">
          <ListFilterIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:sr-only">Filters</span>
        </span>
        <span className="flex items-center gap-1 text-muted-foreground group-data-[collapsible=icon]:hidden">
          {hasActiveFilter ? (
            <span className="tabular-nums">{meta.activeCount}</span>
          ) : null}
          <ChevronDownIcon className="size-3.5" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Filter inbox</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            onFiltersChange(EMPTY_FILTERS);
          }}
        >
          <FilterXIcon className="size-4" />
          Clear filters
          {!hasActiveFilter ? <CheckIcon className="ml-auto size-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <FacetMenu
          active={filters.status}
          count={(status) => countBy(items, status, (item) => item.status)}
          display={(value) => STATUS_LABELS[value]}
          label="Status"
          onToggle={(status) => onFiltersChange({ ...filters, status })}
          values={STATUSES}
        />
        <FacetMenu
          active={filters.severity}
          count={(severity) =>
            countBy(items, severity, (item) => item.decision?.severity ?? null)
          }
          display={(value) => value}
          label="Severity"
          onToggle={(severity) => onFiltersChange({ ...filters, severity })}
          values={SEVERITIES}
        />
        <FacetMenu
          active={filters.project}
          count={(project) =>
            countBy(items, project, (item) => projectOf(item.email.subject))
          }
          display={(value) => value}
          label="Project"
          onToggle={(project) => onFiltersChange({ ...filters, project })}
          values={meta.projects}
        />
        {meta.categories.length > 0 ? (
          <FacetMenu
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
            values={meta.categories}
          />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Large-tap filter controls for the mobile drawer. */
export function InboxFilterPanel({
  items,
  filters,
  onFiltersChange
}: Omit<InboxSidebarProps, 'ledger'>) {
  const meta = useMemo(() => filterMeta(items, filters), [items, filters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Filters</p>
          <p className="text-muted-foreground text-xs">
            {meta.activeCount} active
          </p>
        </div>
        <Button
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          size="sm"
          variant="outline"
        >
          <FilterXIcon />
          Clear
        </Button>
      </div>
      <FacetButtonGroup
        active={filters.status}
        count={(status) => countBy(items, status, (item) => item.status)}
        display={(value) => STATUS_LABELS[value]}
        label="Status"
        onToggle={(status) => onFiltersChange({ ...filters, status })}
        values={STATUSES}
      />
      <FacetButtonGroup
        active={filters.severity}
        count={(severity) =>
          countBy(items, severity, (item) => item.decision?.severity ?? null)
        }
        display={(value) => value}
        label="Severity"
        onToggle={(severity) => onFiltersChange({ ...filters, severity })}
        values={SEVERITIES}
      />
      <FacetButtonGroup
        active={filters.project}
        count={(project) =>
          countBy(items, project, (item) => projectOf(item.email.subject))
        }
        display={(value) => value}
        label="Project"
        onToggle={(project) => onFiltersChange({ ...filters, project })}
        values={meta.projects}
      />
      {meta.categories.length > 0 ? (
        <FacetButtonGroup
          active={filters.category}
          count={(category) =>
            countBy(items, category, (item) => item.decision?.category ?? null)
          }
          display={(value) => CATEGORY_LABELS[value]}
          label="Category"
          onToggle={(category) => onFiltersChange({ ...filters, category })}
          values={meta.categories}
        />
      ) : null}
    </div>
  );
}

/** Mobile filter affordance: opens a swipe-dismissable bottom sheet of filter controls. */
function InboxFilterDrawer({
  items,
  filters,
  onFiltersChange
}: Omit<InboxSidebarProps, 'ledger'>) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = useMemo(() => filterMeta(items, filters), [items, filters]);
  const hasActiveFilter = meta.activeCount > 0;

  return (
    <Drawer onOpenChange={setIsOpen} open={isOpen}>
      <DrawerTrigger
        render={
          <Button
            className="h-9 w-full justify-between px-2.5"
            size="sm"
            variant="outline"
          />
        }
      >
        <span className="flex items-center gap-2">
          <ListFilterIcon className="size-4" />
          Filters
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {hasActiveFilter ? (
            <span className="tabular-nums">{meta.activeCount}</span>
          ) : null}
          <ChevronDownIcon className="size-3.5" />
        </span>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Filter inbox</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <InboxFilterPanel
            filters={filters}
            items={items}
            onFiltersChange={onFiltersChange}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Mobile drawer group for one filter facet. */
function FacetButtonGroup<T extends string>({
  label,
  values,
  active,
  display,
  count,
  onToggle
}: FacetMenuProps<T>) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </h3>
      <div className="grid gap-1.5">
        {values.map((value) => (
          <Button
            className={cn(
              'h-10 justify-between',
              active === value && 'bg-muted'
            )}
            key={value}
            onClick={() => onToggle(active === value ? null : value)}
            variant="ghost"
          >
            <span>{display(value)}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {count(value)}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}

function SidebarProfile() {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md px-2 py-2 transition-[background-color,color] duration-150 ease-panel hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10">
        <UserIcon className="size-6 group-data-[collapsible=icon]:size-5" />
      </span>
      <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="block truncate font-medium text-sm">Project PM</span>
        <span className="block truncate text-muted-foreground text-xs">
          Reviewer
        </span>
      </span>
    </div>
  );
}

/**
 * Left mailbox rail: navigation, compact filter menu, and resize handle.
 *
 * @param items - Triaged items, used to derive filter facets and counts.
 * @param ledger - Ledger entries used for the trace count.
 * @param filters - Active filter facets.
 * @param onFiltersChange - Called with the next filter set on any toggle.
 * @param onRunAgent - Called to open the run screen; omit to hide the action.
 * @returns The sidebar.
 */
export function InboxSidebar({
  items,
  ledger,
  filters,
  onFiltersChange,
  activeSection = 'inbox',
  showFilters = true,
  headerPeek,
  onRunAgent
}: InboxSidebarProps) {
  const queue = useMemo(() => queueMetrics(items, filters), [items, filters]);
  const projects = useMemo(
    () => projectMetrics(items, filters),
    [items, filters]
  );
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar
      className="group/sidebar group-data-[side=left]:border-r-0"
      collapsible="icon"
    >
      {!isMobile && headerPeek !== undefined ? (
        <SidebarHeaderSlice peek={headerPeek} />
      ) : null}
      <SidebarHeader className="gap-3 px-2 py-3 group-data-[collapsible=icon]:items-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === 'inbox'}
              onClick={() => setOpenMobile(false)}
              render={<Link href="/" />}
              tooltip="Inbox"
            >
              <InboxIcon className="size-4" />
              <span>Inbox</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>{items.length}</SidebarMenuBadge>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === 'audit'}
              onClick={() => setOpenMobile(false)}
              render={<Link href="/audit" />}
              tooltip="Audit"
            >
              <HistoryIcon className="size-4" />
              <span>Audit</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>{ledger.length}</SidebarMenuBadge>
          </SidebarMenuItem>
          {onRunAgent ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  setOpenMobile(false);
                  onRunAgent();
                }}
                tooltip="Re-run triage"
              >
                <RefreshCwIcon className="size-4" />
                <span>Re-run triage</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
        {showFilters ? (
          isMobile ? (
            <InboxFilterDrawer
              filters={filters}
              items={items}
              onFiltersChange={onFiltersChange}
            />
          ) : (
            <InboxFilterMenu
              filters={filters}
              items={items}
              onFiltersChange={onFiltersChange}
            />
          )
        ) : null}
      </SidebarHeader>
      <SidebarContent className="gap-5 px-3 py-3 group-data-[collapsible=icon]:hidden">
        <SidebarMetricSection
          label="Queue"
          metrics={queue}
          onFiltersChange={onFiltersChange}
        />
        {showFilters ? (
          <SidebarMetricSection
            label="Projects"
            metrics={projects}
            onFiltersChange={onFiltersChange}
          />
        ) : null}
      </SidebarContent>
      <SidebarFooter className="mt-auto px-2 py-3 group-data-[collapsible=icon]:items-center">
        <SidebarProfile />
      </SidebarFooter>
      <SidebarResizeHandle className="-right-2 top-2 bottom-2" />
    </Sidebar>
  );
}
