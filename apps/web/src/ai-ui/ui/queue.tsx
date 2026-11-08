"use client";

import * as React from "react";
import type { UIMessage } from "../types";
import type { QueueEntry } from "../providers/queue-provider";
import { useQueue, useQueueOptional } from "../providers/queue-provider";

export type {
  QueueContextValue,
  QueueEntry,
} from "../providers/queue-provider";

/**
 * Internal context that lets `QueueItem*` slots read the row they live in
 * without prop drilling. `QueueList` and `QueueItem` are the only producers.
 */
const QueueItemContext = React.createContext<QueueEntry | undefined>(undefined);

/**
 * Read the current `QueueItem` from the surrounding `QueueItem` slot. Throws
 * outside one so children fail loudly during development.
 */
function useQueueItem(): QueueEntry {
  const item = React.use(QueueItemContext);
  if (!item) {
    throw new Error(
      "useQueueItem must be used inside a <QueueItem>; QueueItemContent and QueueItemRemoveButton are the typical consumers.",
    );
  }
  return item;
}

/** Best-effort plain-text view of a UIMessage for one-line previews. */
function extractText(message: UIMessage): string {
  for (const part of message.parts ?? []) {
    if (part.type === "text" && typeof part.text === "string") {
      return part.text;
    }
  }
  return "";
}

interface QueueProps extends React.ComponentProps<"div"> {}

/**
 * Outermost queue slot. Returns `null` when there is no surrounding
 * `QueueProvider` or its post-filter `items` is empty, so consumers can
 * unconditionally mount the tree without guarding visibility upstream.
 */
const Queue = ({ className, children, ...props }: QueueProps) => {
  const ctx = useQueueOptional();
  if (!ctx || ctx.items.length === 0) {
    return null;
  }
  return (
    <div className={className} data-slot="queue" {...props}>
      {children}
    </div>
  );
};

interface QueueHeaderProps extends React.ComponentProps<"div"> {}

/**
 * Eyebrow row above the queue list. Hosts `QueueCount` and
 * `QueueToggleButton`; the slot itself is layout-only.
 */
const QueueHeader = ({ className, ...props }: QueueHeaderProps) => (
  <div className={className} data-slot="queue-header" {...props} />
);

interface QueueCountProps extends React.ComponentProps<"span"> {
  /** Override the default singular/plural label suffix; defaults to `queued`. */
  label?: string;
}

/**
 * Renders `{N} queued` reading from the surrounding `QueueProvider`. Wraps a
 * single `<span>` so styling consumers can drop in their own typography.
 */
const QueueCount = ({
  className,
  children,
  label = "queued",
  ...props
}: QueueCountProps) => {
  const { items } = useQueue();
  return (
    <span className={className} data-slot="queue-count" {...props}>
      {children ?? `${items.length} ${label}`}
    </span>
  );
};

interface QueueToggleButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick" | "children"> {
  /** Render-prop receives the current expansion state so callers can swap icons. */
  children?:
    | React.ReactNode
    | ((args: { isExpanded: boolean }) => React.ReactNode);
}

/**
 * Button that flips the queue's expanded state. Owns aria semantics and
 * delegates icon/label rendering to `children` via a render-prop.
 */
const QueueToggleButton = ({
  className,
  children,
  type = "button",
  ...props
}: QueueToggleButtonProps) => {
  const { isExpanded, toggleExpanded } = useQueue();
  const renderedChildren =
    typeof children === "function" ? children({ isExpanded }) : children;
  return (
    <button
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse queue" : "Expand queue"}
      className={className}
      data-slot="queue-toggle"
      data-state={isExpanded ? "expanded" : "collapsed"}
      onClick={toggleExpanded}
      type={type}
      {...props}
    >
      {renderedChildren}
    </button>
  );
};

interface QueueListProps extends Omit<React.ComponentProps<"ul">, "children"> {
  /** Render-prop overrides the default row (a `QueueItem` containing `QueueItemContent` + `QueueItemRemoveButton`). */
  children?: (item: QueueEntry) => React.ReactNode;
}

/**
 * The `<ul>` of queue rows. Renders only when the queue is expanded, and yields
 * a default row per item when `children` is not provided.
 */
const QueueList = ({ className, children, ...props }: QueueListProps) => {
  const { items, isExpanded } = useQueue();
  if (!isExpanded) {
    return null;
  }
  return (
    <ul className={className} data-slot="queue-list" {...props}>
      {items.map((item) =>
        children ? (
          <React.Fragment key={item.id}>{children(item)}</React.Fragment>
        ) : (
          <QueueItem item={item} key={item.id}>
            <QueueItemContent />
            <QueueItemRemoveButton />
          </QueueItem>
        ),
      )}
    </ul>
  );
};

interface QueueItemProps extends Omit<React.ComponentProps<"li">, "children"> {
  item: QueueEntry;
  children?: React.ReactNode;
}

/**
 * A single queue row. Provides its `item` to descendant slots so they render
 * without prop threading.
 */
const QueueItem = ({ className, item, children, ...props }: QueueItemProps) => (
  <QueueItemContext.Provider value={item}>
    <li
      className={className}
      data-queue-id={item.id}
      data-queue-index={item.queueIndex}
      data-slot="queue-item"
      {...props}
    >
      {children}
    </li>
  </QueueItemContext.Provider>
);

interface QueueItemContentProps extends React.ComponentProps<"span"> {}

/**
 * Renders the text preview of the surrounding `QueueItem`'s `UIMessage`.
 * Emits an empty string for messages whose first non-text part wins (e.g.
 * attachments without captions); styling layers can replace via `children`.
 */
const QueueItemContent = ({
  className,
  children,
  ...props
}: QueueItemContentProps) => {
  const item = useQueueItem();
  const text = extractText(item.message);
  return (
    <span className={className} data-slot="queue-item-content" {...props}>
      {children ?? text}
    </span>
  );
};

interface QueueItemRemoveButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {}

/**
 * Cancel button for a queued message; removes the surrounding row from the
 * queue.
 */
const QueueItemRemoveButton = ({
  className,
  children,
  type = "button",
  ...props
}: QueueItemRemoveButtonProps) => {
  const { onCancel } = useQueue();
  const item = useQueueItem();
  return (
    <button
      aria-label="Cancel queued message"
      className={className}
      data-slot="queue-item-remove"
      onClick={() => onCancel(item.id)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};

interface QueueItemSteerButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {}

/**
 * Promote-to-steer button for a queued message; interrupts the running turn so
 * this entry runs next. Renders `null` when the surrounding `QueueProvider` has
 * no `onPromoteToSteer` wired.
 */
const QueueItemSteerButton = ({
  className,
  children,
  type = "button",
  ...props
}: QueueItemSteerButtonProps) => {
  const { promoteToSteer, canPromoteToSteer } = useQueue();
  const item = useQueueItem();
  if (!canPromoteToSteer) {
    return null;
  }
  return (
    <button
      aria-label="Run this queued message next"
      className={className}
      data-slot="queue-item-steer"
      onClick={() => promoteToSteer(item.id)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};

export {
  Queue,
  QueueCount,
  type QueueCountProps,
  QueueHeader,
  type QueueHeaderProps,
  QueueItem,
  QueueItemContent,
  type QueueItemContentProps,
  type QueueItemProps,
  QueueItemRemoveButton,
  type QueueItemRemoveButtonProps,
  QueueItemSteerButton,
  type QueueItemSteerButtonProps,
  QueueList,
  type QueueListProps,
  type QueueProps,
  QueueToggleButton,
  type QueueToggleButtonProps,
  useQueueItem,
};
