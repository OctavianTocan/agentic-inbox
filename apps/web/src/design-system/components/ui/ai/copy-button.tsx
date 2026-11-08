"use client";

import { AnimatePresence, m } from "motion/react";
import { useCallback, useRef, useState } from "react";
import {
  CopyButton as CopyButtonPrimitive,
  type CopyButtonProps,
} from "@/ai-ui/ui/copy-button";
import { CheckIcon, CopyIcon } from "@/design-system/components/icons";

import { cn } from "../../../lib/utils";
import { buttonVariants } from "../button";

const iconTransition = { type: "spring", stiffness: 600, damping: 25 } as const;

/** Styled copy-to-clipboard button that swaps to a check icon for `timeout` ms after copying. */
export function CopyButton({
  className,
  children,
  onCopy,
  timeout = 1500,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      setIsCopied(true);
      timerRef.current = setTimeout(() => setIsCopied(false), timeout);
      onCopy?.(value);
    },
    [onCopy, timeout],
  );

  return (
    <CopyButtonPrimitive
      className={cn(
        "group/copy",
        buttonVariants({ size: "icon-sm", variant: "ghost" }),
        "text-muted-foreground",
        className,
      )}
      onCopy={handleCopy}
      timeout={timeout}
      {...props}
    >
      {children ?? (
        <span className="relative flex size-4 items-center justify-center">
          <AnimatePresence mode="popLayout">
            {isCopied ? (
              <m.span
                key="check"
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                exit={{ opacity: 0, scale: 0.5 }}
                initial={{ opacity: 0, scale: 0.5 }}
                transition={iconTransition}
              >
                <CheckIcon className="size-4" />
              </m.span>
            ) : (
              <m.span
                key="copy"
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                exit={{ opacity: 0, scale: 0.5 }}
                initial={false}
                transition={iconTransition}
              >
                <CopyIcon className="size-4" />
              </m.span>
            )}
          </AnimatePresence>
        </span>
      )}
    </CopyButtonPrimitive>
  );
}
