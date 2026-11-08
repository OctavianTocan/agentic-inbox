"use client";

import { AnimatePresence, m } from "motion/react";
import { cn } from "../../lib/utils";
import { CheckIcon } from "../icons";

type SavedIndicatorProps = {
  /** When true, the indicator fades in; when false, it fades out and unmounts. */
  show: boolean;
  /** Optional label shown next to the check icon (default: "Saved"). */
  label?: string;
  /** Optional class name applied to the animated chip. */
  className?: string;
};

/**
 * Inline "Saved" confirmation shown briefly after a successful save.
 * Fades in when `show` is true and fades out when it flips to false;
 * pair with `useTimedFlag` to get the auto-dismiss behaviour.
 */
export function SavedIndicator({
  show,
  label = "Saved",
  className,
}: SavedIndicatorProps) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground text-xs",
            className,
          )}
          data-slot="saved-indicator"
          exit={{ opacity: 0, scale: 0.9 }}
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.18 }}
        >
          <CheckIcon aria-hidden="true" className="size-3.5" />
          {label ? <span>{label}</span> : null}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
