'use client';

import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import { Badge } from '@/design-system/components/ui/badge';
import {
  bySeverityDesc,
  projectOf,
  severityBadgeVariant
} from '@/lib/inbox/labels';
import type { InboxItem, InboxSummary, Severity } from '@/lib/inbox/types';

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

type StatProps = {
  readonly label: string;
  readonly value: number;
};

/** Single labelled count in the summary stat row. */
function Stat({ label, value }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-2xl tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
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
    <div className="flex flex-col gap-4 border-b bg-card px-6 py-5">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <Stat label="Processed" value={summary.processed} />
        <Stat label="Handled" value={summary.handled} />
        <Stat label="Need attention" value={summary.needsAttention} />
        <Stat label="Filed" value={summary.filed} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
