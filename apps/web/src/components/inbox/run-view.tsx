'use client';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleCheckIcon,
  PauseIcon,
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
import type { RunTriageOptions } from '@/lib/inbox/client';
import { senderName } from '@/lib/inbox/labels';
import type { InboxItem, TriageRunEvent } from '@/lib/inbox/types';

const TOTAL_EMAILS = 80;
const RECENT_EVENT_LIMIT = 5;

/** Status lines cycled under the spinner while a batch triage run is in flight. */
const RUNNING_STATUS_LINES = [
  'Agent is working through the inbox…',
  'Reading the next message…',
  'Sorting routine from sensitive…',
  'Recording a plain-language decision…',
  'Checking what needs a human…',
  'Filing the easy ones when it can…',
  'Keeping the ledger honest…',
  'Taking it one email at a time…'
] as const;

const RUNNING_STATUS_INTERVAL_MS = 3200;

type RunPhase = 'idle' | 'running' | 'paused' | 'done' | 'error';

type RecentRunEvent = {
  readonly id: number;
  readonly event: TriageRunEvent;
};

type RunViewProps = {
  readonly items: readonly InboxItem[];
  readonly onRun: (options?: RunTriageOptions) => AsyncIterable<TriageRunEvent>;
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
  const abortRef = useRef<AbortController | null>(null);
  const pauseRequestedRef = useRef(false);
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [runTotal, setRunTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [recent, setRecent] = useState<readonly RecentRunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Stays true from run/open start until the parent swaps this view away,
  // so both buttons remain disabled while completion refresh is in flight.
  // Cleared while paused so Resume / Open inbox stay usable.
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

  const startRun = async (fresh: boolean, resume = false) => {
    pauseRequestedRef.current = false;
    setBusy(true);
    setPhase('running');
    setError(null);

    const activeTotal = resume
      ? runTotal > 0
        ? runTotal
        : total
      : fresh
        ? items.length || TOTAL_EMAILS
        : total;

    if (!resume) {
      setProcessed(0);
      setRecent([]);
      nextEventId.current = 0;
      setRunTotal(activeTotal);
    }

    if (activeTotal === 0) {
      setPhase('done');
      await onComplete();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const event of onRun({
        // Resume never clears prior decisions — only process what's left.
        fresh: resume ? false : fresh,
        signal: controller.signal
      })) {
        if (event.type === 'started') {
          setProcessed((current) => Math.min(current + 1, activeTotal));
        }
        if (event.type === 'done') {
          // `done.processed` is this segment's size; the progress denominator is
          // the original run total, so snap to that when the stream finishes.
          setProcessed(activeTotal);
        }
        nextEventId.current += 1;
        const recentEvent = { id: nextEventId.current, event };
        setRecent((current) =>
          [recentEvent, ...current].slice(0, RECENT_EVENT_LIMIT)
        );
      }
      if (controller.signal.aborted && pauseRequestedRef.current) {
        setPhase('paused');
        setBusy(false);
        abortRef.current = null;
        return;
      }
      setPhase('done');
      await onComplete();
    } catch (caught) {
      if (controller.signal.aborted && pauseRequestedRef.current) {
        setPhase('paused');
        setBusy(false);
        abortRef.current = null;
        return;
      }
      setBusy(false);
      setPhase('error');
      setError(caught instanceof Error ? caught.message : 'Triage run failed');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const pauseRun = () => {
    if (phase !== 'running' || abortRef.current === null) {
      return;
    }
    pauseRequestedRef.current = true;
    abortRef.current.abort();
  };

  const openInbox = async () => {
    pauseRequestedRef.current = false;
    abortRef.current?.abort();
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
                      : phase === 'paused'
                        ? 'Paused'
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
                  disabled={busy && phase !== 'paused'}
                  onClick={() => void openInbox()}
                  variant="outline"
                >
                  Open current inbox
                </Button>
                {phase === 'running' ? (
                  <Button
                    className="text-primary-foreground"
                    onClick={pauseRun}
                  >
                    <PauseIcon />
                    Pause
                  </Button>
                ) : phase === 'paused' ? (
                  <Button
                    className="text-primary-foreground"
                    onClick={() => void startRun(false, true)}
                  >
                    <PlayIcon />
                    Resume
                  </Button>
                ) : (
                  <Button
                    className="text-primary-foreground"
                    disabled={busy}
                    onClick={() => void startRun(false)}
                  >
                    <PlayIcon />
                    Run for real
                  </Button>
                )}
              </div>
            </div>

            {phase === 'running' ? (
              <div className="flex items-center gap-2.5 rounded-md bg-muted/60 px-4 py-3 text-sm leading-5">
                <AgentSpinner
                  className="-translate-y-px text-primary"
                  label="Triaging"
                  size={1}
                />
                <RunningStatusShimmer />
              </div>
            ) : null}

            {phase === 'paused' ? (
              <div className="flex items-center gap-2.5 rounded-md bg-muted/60 px-4 py-3 text-muted-foreground text-sm leading-5">
                <PauseIcon className="size-4 shrink-0" />
                <span>Paused — resume whenever you want to continue.</span>
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

/**
 * Crossfading shimmer status lines.
 *
 * TextShimmer uses `text-transparent` + `bg-clip-text`, so it must wrap the
 * literal string — nesting RotatingText inside it made the copy invisible.
 * AnimatePresence provides the smooth swap around each shimmer instance.
 */
function RunningStatusShimmer() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % RUNNING_STATUS_LINES.length);
    }, RUNNING_STATUS_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const line = RUNNING_STATUS_LINES[index] ?? RUNNING_STATUS_LINES[0];

  return (
    <span className="relative inline-block min-h-5 min-w-[20ch] overflow-hidden">
      <AnimatePresence initial={false} mode="wait">
        <m.span
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          key={line}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <TextShimmer
            as="span"
            baseColor="var(--muted-foreground)"
            textLength={line.length}
          >
            {line}
          </TextShimmer>
        </m.span>
      </AnimatePresence>
    </span>
  );
}

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
