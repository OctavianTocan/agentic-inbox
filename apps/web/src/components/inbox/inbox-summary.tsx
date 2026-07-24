'use client';

import { ChevronDownIcon } from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import {
  Collapsible,
  CollapsibleAnimatedContent,
  CollapsibleTrigger
} from '@/design-system/components/ui/collapsible';
import { CATEGORY_LABELS, projectOf } from '@/lib/inbox/labels';
import type { Category, InboxItem, InboxSummary } from '@/lib/inbox/types';

type InboxSummaryBlockProps = {
  readonly summary: InboxSummary | null;
  readonly items: readonly InboxItem[];
  readonly isLoading: boolean;
};

/** Distinct projects with their item counts, busiest first. */
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
    if (item.classification) {
      counts.set(
        item.classification.category,
        (counts.get(item.classification.category) ?? 0) + 1
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
 * At-a-glance inbox roll-up: a collapsible prose summary of the agent's work,
 * open by default. Shows a spinner while the inbox is still computing.
 *
 * @param summary - Roll-up counts, or null before the first load.
 * @param items - Triaged items used to phrase the summary.
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
        <AgentSpinner label="Computing inbox summary" />
        <span>Reviewing your inbox…</span>
      </div>
    );
  }

  return (
    <Collapsible className="flex flex-col border-b bg-card/70" defaultOpen>
      <CollapsibleTrigger className="group flex w-full items-center gap-1.5 px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide outline-none transition-colors hover:text-foreground focus-visible:text-foreground sm:px-6 sm:py-4">
        <ChevronDownIcon className="-rotate-90 size-3.5 shrink-0 transition-transform group-data-[panel-open]:rotate-0" />
        At a glance
      </CollapsibleTrigger>
      <CollapsibleAnimatedContent>
        <div className="flex flex-col gap-3 px-4 pb-3 sm:px-6 sm:pb-4">
          <div className="max-w-3xl">
            <p className="text-sm leading-6 max-md:line-clamp-3">
              {summaryText(summary, items)}
            </p>
          </div>
        </div>
      </CollapsibleAnimatedContent>
    </Collapsible>
  );
}
