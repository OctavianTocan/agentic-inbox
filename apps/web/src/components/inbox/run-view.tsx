'use client';

import { useEffect, useState } from 'react';
import { CircleCheckIcon } from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import {
  Progress,
  ProgressLabel,
  ProgressValue
} from '@/design-system/components/ui/progress';
import { senderName } from '@/lib/inbox/labels';
import type { InboxItem } from '@/lib/inbox/types';

const TOTAL_EMAILS = 80;
const STEP_MS = 90;

type RunViewProps = {
  readonly items: readonly InboxItem[];
  readonly onComplete: () => void;
};

/**
 * First-run streaming view: a progress bar counting to 80 with live spinner
 * rows for the emails currently being triaged. Calls `onComplete` when the
 * simulated run finishes.
 *
 * @param items - Triaged items whose subjects seed the live activity rows.
 * @param onComplete - Called once the run reaches the full count.
 * @returns The run view.
 */
export function RunView({ items, onComplete }: RunViewProps) {
  const [processed, setProcessed] = useState(0);

  useEffect(() => {
    if (processed >= TOTAL_EMAILS) {
      const done = setTimeout(onComplete, 320);
      return () => clearTimeout(done);
    }
    const tick = setTimeout(
      () => setProcessed((prev) => Math.min(prev + 1, TOTAL_EMAILS)),
      STEP_MS
    );
    return () => clearTimeout(tick);
  }, [processed, onComplete]);

  const activeRows = items.slice(0, 4);
  const value = Math.round((processed / TOTAL_EMAILS) * 100);

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col justify-center gap-6 px-6">
      <div className="flex items-center gap-3">
        <AgentSpinner size={1.1} variant="arc" label="Triaging inbox" />
        <div>
          <h1 className="font-semibold text-xl">Triaging your inbox</h1>
          <p className="text-muted-foreground text-sm">
            The agent is processing {TOTAL_EMAILS} emails.
          </p>
        </div>
      </div>
      <Progress value={value}>
        <ProgressLabel>Processed</ProgressLabel>
        <ProgressValue>{() => `${processed}/${TOTAL_EMAILS}`}</ProgressValue>
      </Progress>
      <div className="flex flex-col gap-2">
        {activeRows.map((item, index) => {
          const isDone = processed > index * (TOTAL_EMAILS / activeRows.length);
          return (
            <div
              className="flex items-center gap-2 text-muted-foreground text-sm"
              key={item.email.id}
            >
              {isDone ? (
                <CircleCheckIcon className="size-4 text-success" />
              ) : (
                <AgentSpinner label="Working" variant="dots" />
              )}
              <span className="truncate">
                {senderName(item.email.from)} — {item.email.subject}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
