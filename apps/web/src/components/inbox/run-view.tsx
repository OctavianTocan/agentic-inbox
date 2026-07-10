'use client';

import { useMemo, useRef, useState } from 'react';
import {
  CircleCheckIcon,
  PlayIcon,
  TriangleAlertIcon
} from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import { Button } from '@/design-system/components/ui/button';
import {
  Progress,
  ProgressLabel,
  ProgressValue
} from '@/design-system/components/ui/progress';
import { TextShimmer } from '@/design-system/components/ui/text-shimmer';
import { senderName } from '@/lib/inbox/labels';
import type { InboxItem, TriageRunEvent } from '@/lib/inbox/types';

const TOTAL_EMAILS = 80;
const RECENT_EVENT_LIMIT = 5;

type RunPhase = 'idle' | 'running' | 'done' | 'error';

type RecentRunEvent = {
  readonly id: number;
  readonly event: TriageRunEvent;
};

type RunViewProps = {
  readonly items: readonly InboxItem[];
  readonly onRun: (fresh: boolean) => AsyncIterable<TriageRunEvent>;
  readonly onComplete: () => Promise<void> | void;
};

/**
 * First-run streaming view: asks before running the real batch triage endpoint,
 * then renders live SSE progress and recent action events.
 *
 * @param items - Triaged items whose subjects seed the live activity rows.
 * @param onRun - Starts the backend triage stream; fresh clears prior triage state and re-processes every email.
 * @param onComplete - Called once the run reaches the full count.
 * @returns The run view.
 */
export function RunView({ items, onRun, onComplete }: RunViewProps) {
  const untriaged = items.filter((item) => item.decision === null).length;
  const total = items.length > 0 ? untriaged : TOTAL_EMAILS;
  const nextEventId = useRef(0);
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [runTotal, setRunTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [recent, setRecent] = useState<readonly RecentRunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Stays true from run/open start until the parent swaps this view away,
  // so both buttons remain disabled while completion refresh is in flight.
  const [busy, setBusy] = useState(false);

  const subjectByEmailId = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of items) {
      lookup.set(
        item.email.id,
        `${senderName(item.email.from)} - ${item.email.subject}`
      );
    }
    return lookup;
  }, [items]);

  const displayTotal = phase === 'idle' ? total : runTotal;
  const value =
    displayTotal > 0 ? Math.round((processed / displayTotal) * 100) : 100;
  const isInboxEmpty = items.length > 0 && untriaged === 0 && phase === 'idle';

  const startRun = async (fresh: boolean) => {
    setBusy(true);
    setPhase('running');
    setProcessed(0);
    setRecent([]);
    setError(null);
    nextEventId.current = 0;
    // A fresh re-run re-triages the whole inbox, so its denominator is the
    // full set even when nothing is currently untriaged.
    const activeTotal = fresh ? items.length || TOTAL_EMAILS : total;
    setRunTotal(activeTotal);
    if (activeTotal === 0) {
      setPhase('done');
      await onComplete();
      return;
    }
    try {
      for await (const event of onRun(fresh)) {
        if (event.type === 'started') {
          setProcessed((current) => Math.min(current + 1, activeTotal));
        }
        if (event.type === 'done') {
          setProcessed(event.processed);
        }
        nextEventId.current += 1;
        const recentEvent = { id: nextEventId.current, event };
        setRecent((current) =>
          [recentEvent, ...current].slice(0, RECENT_EVENT_LIMIT)
        );
      }
      setPhase('done');
      await onComplete();
    } catch (caught) {
      setBusy(false);
      setPhase('error');
      setError(caught instanceof Error ? caught.message : 'Triage run failed');
    }
  };

  const openInbox = async () => {
    setBusy(true);
    setError(null);
    try {
      await onComplete();
    } catch (caught) {
      setBusy(false);
      setPhase('error');
      setError(
        caught instanceof Error ? caught.message : 'Failed to open inbox'
      );
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center gap-5 overflow-hidden px-5 py-6 sm:gap-7 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display font-semibold text-2xl">
          {isInboxEmpty
            ? 'The inbox is all caught up'
            : 'Run the agent across the inbox?'}
        </h1>
        <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
          {isInboxEmpty
            ? 'Every email has been triaged. Open the inbox to review what the agent handled, or run the agent again to re-triage from scratch.'
            : `This will process the fixed set of ${total} messages, auto-handle routine work, and hold sensitive work for your review. The run uses the real local API, not a simulated progress screen.`}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card/80 p-4 shadow-sm">
        {isInboxEmpty ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">No emails left to process</p>
              <p className="text-muted-foreground text-xs">
                Nothing is waiting in the triage queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="text-primary-foreground"
                disabled={busy}
                onClick={() => void openInbox()}
              >
                Open current inbox
              </Button>
              <Button
                disabled={busy}
                onClick={() => void startRun(true)}
                variant="outline"
              >
                <PlayIcon />
                Run again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">
                  {phase === 'idle'
                    ? 'Ready to triage'
                    : phase === 'running'
                      ? 'Triaging emails'
                      : phase === 'done'
                        ? 'Run complete'
                        : 'Run interrupted'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {processed}/{displayTotal} processed
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => void openInbox()}
                  variant="outline"
                >
                  Open current inbox
                </Button>
                <Button
                  className="text-primary-foreground"
                  disabled={busy}
                  onClick={() => void startRun(false)}
                >
                  <PlayIcon />
                  Run for real
                </Button>
              </div>
            </div>

            {phase === 'running' ? (
              <div className="flex items-center gap-2.5 rounded-md bg-muted/60 px-4 py-3 text-sm leading-5">
                <AgentSpinner
                  className="-translate-y-px text-primary"
                  label="Triaging"
                  size={1}
                />
                <TextShimmer as="span" baseColor="var(--muted-foreground)">
                  Agent is working through the inbox…
                </TextShimmer>
              </div>
            ) : null}

            <Progress value={value}>
              <ProgressLabel>Processed</ProgressLabel>
              <ProgressValue>
                {() => `${processed}/${displayTotal}`}
              </ProgressValue>
            </Progress>

            {error ? (
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 text-muted-foreground" />
                <span>{error}</span>
              </div>
            ) : null}

            {recent.length > 0 ? (
              <div className="flex max-h-36 flex-col gap-2 overflow-hidden">
                {recent.map(({ event, id }) => (
                  <RunEventRow
                    event={event}
                    key={id}
                    subjectByEmailId={subjectByEmailId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No run events yet. Start the agent when you want the backend to
                do the real triage pass.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type RunEventRowProps = {
  readonly event: TriageRunEvent;
  readonly subjectByEmailId: ReadonlyMap<string, string>;
};

/** Renders one recent triage event in the first-run screen. */
function RunEventRow({ event, subjectByEmailId }: RunEventRowProps) {
  const isFailure = event.type === 'failed';
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      {isFailure ? (
        <TriangleAlertIcon className="size-4" />
      ) : (
        <CircleCheckIcon className="size-4 text-success" />
      )}
      <span className="truncate">{eventText(event, subjectByEmailId)}</span>
    </div>
  );
}

/** Formats a triage event as a compact user-facing activity line. */
function eventText(
  event: TriageRunEvent,
  subjectByEmailId: ReadonlyMap<string, string>
): string {
  if (event.type === 'done') {
    return `Finished ${event.processed} emails`;
  }
  const subject = subjectByEmailId.get(event.emailId) ?? event.emailId;
  if (event.type === 'action') {
    return `${event.summary}: ${subject}`;
  }
  if (event.type === 'approval_pending') {
    return `Needs approval: ${subject}`;
  }
  if (event.type === 'failed') {
    return `Failed ${subject}: ${event.reason}`;
  }
  if (event.type === 'decision') {
    return `Recorded decision: ${subject}`;
  }
  return `Started: ${subject}`;
}
