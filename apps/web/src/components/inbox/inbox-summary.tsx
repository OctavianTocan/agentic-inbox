'use client';

import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import { Badge } from '@/design-system/components/ui/badge';
import {
  bySeverityDesc,
  CATEGORY_LABELS,
  projectOf,
  severityBadgeVariant
} from '@/lib/inbox/labels';
import type {
  Category,
  InboxItem,
  InboxSummary,
  Severity
} from '@/lib/inbox/types';

const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

type InboxSummaryBlockProps = {
  readonly summary: InboxSummary | null;
  readonly items: readonly InboxItem[];
  readonly isLoading: boolean;
};

/** Count of items per severity across triaged emails. */
function severityCounts(
  items: readonly InboxItem[]
): Readonly<Record<Severity, number>> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  for (const item of items) {
    if (item.decision) {
      counts[item.decision.severity] += 1;
    }
  }
  return counts;
}

/** Distinct project chips with their item counts, busiest first. */
function projectChips(
  items: readonly InboxItem[]
): readonly { readonly name: string; readonly count: number }[] {
  const byProject = new Map<string, number>();
  for (const item of items) {
    const name = projectOf(item.email.subject);
    byProject.set(name, (byProject.get(name) ?? 0) + 1);
  }
  return [...byProject.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Counts decisions by category. */
function categoryCounts(
  items: readonly InboxItem[]
): ReadonlyMap<Category, number> {
  const counts = new Map<Category, number>();
  for (const item of items) {
    if (item.decision) {
      counts.set(
        item.decision.category,
        (counts.get(item.decision.category) ?? 0) + 1
      );
    }
  }
  return counts;
}

/** Finds the busiest category in the current triage result. */
function topCategory(items: readonly InboxItem[]): Category | null {
  let leader: Category | null = null;
  let leaderCount = 0;
  for (const [category, count] of categoryCounts(items)) {
    if (count > leaderCount) {
      leader = category;
      leaderCount = count;
    }
  }
  return leader;
}

/** Builds the human-readable agent summary copy above the inbox list. */
function summaryText(
  summary: InboxSummary,
  items: readonly InboxItem[]
): string {
  if (summary.processed === 0) {
    return `The agent has not triaged this inbox yet. The current view shows all ${summary.needsAttention} emails waiting for review; run the batch agent to generate handled, filed, and traceable action results.`;
  }
  const busiestProject = projectChips(items)[0]?.name ?? 'the projects';
  const category = topCategory(items);
  const categoryText = category
    ? CATEGORY_LABELS[category].toLowerCase()
    : 'work';
  return `The agent reviewed ${summary.processed} emails across ${busiestProject}, handled ${summary.handled} routine items, filed ${summary.filed}, and left ${summary.needsAttention} for your review. Most of the remaining attention is ${categoryText}; sensitive or low-confidence items stayed in your queue.`;
}

/**
 * At-a-glance inbox roll-up: counts, project chips, and a severity breakdown.
 * Shows a spinner while the inbox is still computing.
 *
 * @param summary - Roll-up counts, or null before the first load.
 * @param items - Triaged items used for chips and the severity breakdown.
 * @param isLoading - Whether the inbox is still loading.
 * @returns The summary band.
 */
export function InboxSummaryBlock({
  summary,
  items,
  isLoading
}: InboxSummaryBlockProps) {
  if (isLoading || summary === null) {
    return (
      <div className="flex items-center gap-3 border-b bg-card px-6 py-5 text-muted-foreground text-sm">
        <AgentSpinner variant="dotsCircle" label="Computing inbox summary" />
        <span>Reviewing your inbox…</span>
      </div>
    );
  }

  const severities = severityCounts(items);
  const chips = projectChips(items);
  const sorted = [...items].sort(bySeverityDesc);

  return (
    <div className="flex flex-col gap-3 border-b bg-card/70 px-4 py-3 sm:px-6 sm:py-4">
      <div className="max-w-3xl">
        <p className="text-sm leading-6 max-md:line-clamp-3">
          {summaryText(summary, items)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-0.5">
        {chips.map((chip) => (
          <Badge key={chip.name} variant="outline">
            {chip.name}
            <span className="ml-1 text-muted-foreground tabular-nums">
              {chip.count}
            </span>
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SEVERITIES.filter((severity) => severities[severity] > 0).map(
          (severity) => (
            <Badge key={severity} variant={severityBadgeVariant(severity)}>
              {severity}
              <span className="ml-1 tabular-nums">{severities[severity]}</span>
            </Badge>
          )
        )}
        <span className="sr-only">{sorted.length} triaged emails</span>
      </div>
    </div>
  );
}
