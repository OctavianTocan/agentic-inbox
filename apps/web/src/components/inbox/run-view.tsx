'use client';

import { useMemo, useState } from 'react';
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
import { senderName } from '@/lib/inbox/labels';
import type { InboxItem, TriageRunEvent } from '@/lib/inbox/types';

const TOTAL_EMAILS = 80;
const RECENT_EVENT_LIMIT = 5;

type RunPhase = 'idle' | 'running' | 'done' | 'error';

type RunViewProps = {
  readonly items: readonly InboxItem[];
  readonly onRun: () => AsyncIterable<TriageRunEvent>;
  readonly onComplete: () => Promise<void> | void;
};

/**
 * First-run streaming view: asks before running the real batch triage endpoint,
 * then renders live SSE progress and recent action events.
 *
 * @param items - Triaged items whose subjects seed the live activity rows.
 * @param onRun - Starts the backend triage stream.
 * @param onComplete - Called once the run reaches the full count.
 * @returns The run view.
 */
export function RunView({ items, onRun, onComplete }: RunViewProps) {
  const total = items.length > 0 ? items.length : TOTAL_EMAILS;
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [processed, setProcessed] = useState(0);
  const [recent, setRecent] = useState<readonly TriageRunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const value = Math.round((processed / total) * 100);

  const startRun = async () => {
    setPhase('running');
    setProcessed(0);
    setRecent([]);
    setError(null);
    try {
      for await (const event of onRun()) {
        if (event.type === 'started') {
          setProcessed((current) => Math.min(current + 1, total));
        }
        if (event.type === 'done') {
          setProcessed(event.processed);
        }
        setRecent((current) =>
          [event, ...current].slice(0, RECENT_EVENT_LIMIT)
        );
      }
      setPhase('done');
      await onComplete();
    } catch (caught) {
      setPhase('error');
      setError(caught instanceof Error ? caught.message : 'Triage run failed');
    }
  };

  const openInbox = async () => {
    await onComplete();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-7 px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-sans font-semibold text-2xl tracking-normal sm:text-3xl">
          Run the agent across the inbox?
        </h1>
        <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
          This will process the fixed set of {total} construction emails,
          auto-handle routine messages, and hold sensitive work for your review.
          The run uses the real local API, not a simulated progress screen.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card/80 p-4 shadow-sm">
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
              {processed}/{total} processed
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={phase === 'running'}
              onClick={() => void openInbox()}
              variant="outline"
            >
              Open current inbox
            </Button>
            <Button
              disabled={phase === 'running'}
              onClick={() => void startRun()}
            >
              {phase === 'running' ? (
                <AgentSpinner label="Running" variant="dots" />
              ) : (
                <PlayIcon />
              )}
              Run for real
            </Button>
          </div>
        </div>

        <Progress value={value}>
          <ProgressLabel>Processed</ProgressLabel>
          <ProgressValue>{() => `${processed}/${total}`}</ProgressValue>
        </Progress>

        {error ? (
          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
            <TriangleAlertIcon className="mt-0.5 size-4 text-muted-foreground" />
            <span>{error}</span>
          </div>
        ) : null}

        {recent.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recent.map((event) => (
              <RunEventRow
                event={event}
                key={`${event.type}-${eventText(event, subjectByEmailId)}`}
                subjectByEmailId={subjectByEmailId}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No run events yet. Start the agent when you want the backend to do
            the real triage pass.
          </p>
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
