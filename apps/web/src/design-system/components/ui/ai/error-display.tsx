"use client";

import type { ReactNode } from "react";
import { useMessage } from "@/ai-ui/providers/message-provider";
import { useThread } from "@/ai-ui/providers/thread-provider";
import { TriangleAlertIcon } from "@/design-system/components/icons";
import { cn } from "../../../lib/utils";

/** Thread-level error banner with an optional retry action; renders nothing when the thread has no error. */
export function ThreadError({
  className,
  onRetry,
  children,
}: {
  className?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  const { status } = useThread();

  if (status.type !== "error") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className,
      )}
      data-slot="thread-error"
      role="alert"
    >
      <TriangleAlertIcon className="size-4 shrink-0" />
      <div className="flex-1">
        {children ?? status.error?.message ?? "An error occurred"}
      </div>
      {onRetry && (
        <button
          className="text-sm font-medium underline underline-offset-2"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Message-level error notice; renders nothing when the message has no error. */
export function MessageError({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const { status } = useMessage();

  if (status.type !== "error") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-destructive",
        className,
      )}
      data-slot="message-error"
      role="alert"
    >
      <TriangleAlertIcon className="size-4 shrink-0" />
      <span>{children ?? "Failed to generate response"}</span>
    </div>
  );
}
