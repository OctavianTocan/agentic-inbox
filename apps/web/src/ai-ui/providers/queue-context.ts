"use client";

import type { UIMessage } from "ai";
import { createContext } from "react";

/**
 * One slot in the projected queue. Carries the harness queue-entry id, the
 * batch index it landed in, and the original `UIMessage` so consumers can
 * render content without an extra round-trip.
 */
export interface QueueEntry {
  readonly id: number;
  readonly queueIndex: number;
  readonly message: UIMessage;
}

export interface QueueContextValue {
  /** Items after the sentinel filter has run, in projector order. */
  readonly items: readonly QueueEntry[];
  /** Whether the list of items is currently shown in full vs collapsed. */
  readonly isExpanded: boolean;
  /** True when the surrounding `QueueProvider` was given an `onPromoteToSteer` handler. UI hides the steer affordance when false. */
  readonly canPromoteToSteer: boolean;
  toggleExpanded(): void;
  onCancel(id: number): void;
  /** Promote the queue entry with `id` to "steer next" — interrupts the running turn and runs that entry immediately. No-op when no `onPromoteToSteer` was wired. */
  promoteToSteer(id: number): void;
}

/** React context for the queue state and actions. */
export const QueueContext = createContext<QueueContextValue | undefined>(
  undefined,
);

/** True when the message looks like a resume sentinel rather than user content. */
export function isResumeSentinel(message: UIMessage): boolean {
  const id = String(message.id ?? "");
  if (id.startsWith("resume-")) {
    return true;
  }
  const parts = message.parts ?? [];
  return parts.length === 0;
}
