"use client";

import { AnimatePresence, m } from "motion/react";
import {
  type QueueContextValue,
  useQueue,
} from "@/ai-ui/providers/queue-provider";
import {
  QueueCount as QueueCountPrimitive,
  type QueueCountProps,
  QueueHeader as QueueHeaderPrimitive,
  type QueueHeaderProps,
  QueueItemContent as QueueItemContentPrimitive,
  type QueueItemContentProps,
  QueueItem as QueueItemPrimitive,
  type QueueItemProps,
  QueueItemRemoveButton as QueueItemRemoveButtonPrimitive,
  type QueueItemRemoveButtonProps,
  QueueItemSteerButton as QueueItemSteerButtonPrimitive,
  type QueueItemSteerButtonProps,
  type QueueListProps,
  Queue as QueuePrimitive,
  type QueueProps,
  QueueToggleButton as QueueToggleButtonPrimitive,
  type QueueToggleButtonProps,
  useQueueItem,
} from "@/ai-ui/ui/queue";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  TrashIcon,
} from "@/design-system/components/icons";

import { cn } from "../../../lib/utils";
import { buttonVariants } from "../button";

/** Styled root container for the queued-message list. */
const Queue = ({ className, ...props }: QueueProps) => (
  <QueuePrimitive
    className={cn(
      "flex flex-col gap-0.5 border-border border-b px-3 pt-1.5 pb-1",
      className,
    )}
    {...props}
  />
);

/** Styled header row for the queue, holding the count and toggle. */
const QueueHeader = ({ className, ...props }: QueueHeaderProps) => (
  <QueueHeaderPrimitive
    className={cn(
      "flex items-center gap-1.5 px-1 text-muted-foreground text-xs",
      className,
    )}
    {...props}
  />
);

/** Styled tabular count of queued items. */
const QueueCount = ({ className, ...props }: QueueCountProps) => (
  <QueueCountPrimitive
    className={cn("font-medium tabular-nums", className)}
    {...props}
  />
);

/** Styled button that expands or collapses the queue list. */
const QueueToggleButton = ({
  className,
  children,
  ...props
}: QueueToggleButtonProps) => (
  <QueueToggleButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-xs", variant: "ghost" }),
      "ml-auto aria-expanded:bg-transparent aria-expanded:text-inherit focus-visible:bg-transparent",
      className,
    )}
    {...props}
  >
    {children ??
      (({ isExpanded }: { isExpanded: boolean }) => (
        <ChevronDownIcon
          className={cn(
            "size-3 transition-transform duration-150 ease-out",
            !isExpanded && "rotate-90",
          )}
        />
      ))}
  </QueueToggleButtonPrimitive>
);

/**
 * Animated list of queued items, rendered only while the queue is
 * expanded. Pass `children` to customise each row, else default content,
 * steer, and remove controls are shown.
 */
const QueueList = ({ className, children }: QueueListProps) => {
  const { items, isExpanded } = useQueue();
  if (!isExpanded) {
    return null;
  }
  return (
    <ul
      className={cn(
        "flex max-h-44 flex-col gap-0.5 overflow-y-auto",
        className,
      )}
      data-slot="queue-list"
    >
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <m.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            key={item.id}
            transition={{
              duration: 0.15,
              ease: "easeOut",
              delay: index * 0.05,
            }}
          >
            <QueueItem item={item}>
              {children ? (
                children(item)
              ) : (
                <>
                  <QueueItemContent />
                  <QueueItemSteerButton />
                  <QueueItemRemoveButton />
                </>
              )}
            </QueueItem>
          </m.div>
        ))}
      </AnimatePresence>
    </ul>
  );
};

/** Styled single row within the queue list. */
const QueueItem = ({ className, ...props }: QueueItemProps) => (
  <QueueItemPrimitive
    className={cn(
      "group flex items-center gap-0.5 rounded-sm px-2 py-0.5 text-sm hover:bg-muted/50",
      className,
    )}
    {...props}
  />
);

/** Styled truncating text body of a queue item. */
const QueueItemContent = ({ className, ...props }: QueueItemContentProps) => (
  <QueueItemContentPrimitive
    className={cn("flex-1 truncate text-foreground/90", className)}
    {...props}
  />
);

/** Styled button that removes its item from the queue. */
const QueueItemRemoveButton = ({
  className,
  children,
  ...props
}: QueueItemRemoveButtonProps) => (
  <QueueItemRemoveButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-xs", variant: "ghost" }),
      "opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100",
      className,
    )}
    {...props}
  >
    {children ?? <TrashIcon className="size-3" />}
  </QueueItemRemoveButtonPrimitive>
);

/** Styled button that steers the agent toward its queued item. */
const QueueItemSteerButton = ({
  className,
  children,
  ...props
}: QueueItemSteerButtonProps) => (
  <QueueItemSteerButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-xs", variant: "ghost" }),
      "opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100",
      className,
    )}
    {...props}
  >
    {children ?? <ArrowRightIcon className="size-3" />}
  </QueueItemSteerButtonPrimitive>
);

export {
  ClockIcon as QueueClockIcon,
  Queue,
  type QueueContextValue,
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
  useQueue,
  useQueueItem,
};
