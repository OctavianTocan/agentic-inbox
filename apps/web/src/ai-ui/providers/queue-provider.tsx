"use client";

import {
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isResumeSentinel,
  QueueContext,
  type QueueContextValue,
  type QueueEntry,
} from "./queue-context";

export type { QueueContextValue, QueueEntry } from "./queue-context";

/**
 * Read the surrounding `QueueProvider`. Throws when called outside one;
 * mirrors `useComposer` / `useThread` semantics.
 */
export function useQueue(): QueueContextValue {
  const context = use(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return context;
}

/**
 * Read the surrounding `QueueProvider` if one exists, else return `undefined`.
 * Used by queue-aware UI primitives (e.g. the `Queue` slot) so they can
 * render `null` gracefully when no queue is wired up upstream.
 */
export function useQueueOptional(): QueueContextValue | undefined {
  return use(QueueContext);
}

interface QueueProviderProps {
  /** Raw projector items (pre sentinel-filter). */
  items: readonly QueueEntry[];
  onCancel: (id: number) => void;
  /** Optional: promote a queued entry to "steer next". When wired, every row exposes a steer button. */
  onPromoteToSteer?: (id: number) => void;
  /** Override the auto-pick: by default the list expands when `items.length <= collapseThreshold` and collapses otherwise. */
  defaultExpanded?: boolean;
  /** Threshold above which the list collapses by default. Defaults to `2`. */
  collapseThreshold?: number;
  /** Drop resume sentinels (UIMessages with empty `parts`, or ids prefixed `resume-`). Defaults to `true`. */
  filterSentinels?: boolean;
  children: ReactNode;
}

const DEFAULT_COLLAPSE_THRESHOLD = 2;

/**
 * Provides queue state to the `Queue*` compound family. Owns the sentinel
 * filter, the collapse toggle, and the cancel callback so the slots can stay
 * stateless and read-only.
 */
export function QueueProvider({
  items,
  onCancel,
  onPromoteToSteer,
  defaultExpanded,
  collapseThreshold = DEFAULT_COLLAPSE_THRESHOLD,
  filterSentinels = true,
  children,
}: QueueProviderProps) {
  const filteredItems = useMemo<readonly QueueEntry[]>(
    () =>
      filterSentinels
        ? items.filter((item) => !isResumeSentinel(item.message))
        : items,
    [items, filterSentinels],
  );

  const initialExpanded =
    defaultExpanded ?? filteredItems.length <= collapseThreshold;
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const prevFilteredLengthRef = useRef(filteredItems.length);

  // When the queue empties, reset to the default expand state inline during
  // render so re-opening the next batch starts in the expected mode.
  if (filteredItems.length === 0 && prevFilteredLengthRef.current !== 0) {
    setIsExpanded(defaultExpanded ?? true);
  }
  prevFilteredLengthRef.current = filteredItems.length;

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const promoteToSteer = useCallback(
    (id: number) => {
      onPromoteToSteer?.(id);
    },
    [onPromoteToSteer],
  );

  const value = useMemo<QueueContextValue>(
    () => ({
      items: filteredItems,
      isExpanded,
      canPromoteToSteer: onPromoteToSteer !== undefined,
      toggleExpanded,
      onCancel,
      promoteToSteer,
    }),
    [
      filteredItems,
      isExpanded,
      onPromoteToSteer,
      toggleExpanded,
      onCancel,
      promoteToSteer,
    ],
  );

  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
}
