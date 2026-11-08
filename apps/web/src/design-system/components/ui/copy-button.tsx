"use client";

import * as React from "react";
import { useCopyAffordanceEnabled } from "@/ai-ui/providers/copy-affordance-provider";
import { useCopyToClipboard } from "../../hooks/use-copy-to-clipboard";
import { cn } from "../../lib/utils";
import { CheckIcon, CopyIcon } from "../icons";
import { Button } from "./button";

export interface CopyButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "onCopy"> {
  /** The text value to copy to clipboard */
  value: string;
  /** Callback fired when copy succeeds */
  onCopy?: (value: string) => void;
  /** Original onClick handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Timeout in milliseconds before resetting copied state */
  timeout?: number;
}

/**
 * CopyButton component that extends Button with clipboard functionality
 *
 * Example usage:
 * ```tsx
 * <CopyButton value="Text to copy" variant="ghost" size="icon">
 *   <CopyIcon className="h-4 w-4" />
 * </CopyButton>
 * ```
 */
export function CopyButton({
  value,
  onCopy,
  onClick,
  timeout = 1500,
  children,
  className,
  "aria-label": ariaLabel,
  ...props
}: CopyButtonProps) {
  const { isCopied, copy } = useCopyToClipboard({ timeout });
  const affordanceEnabled = useCopyAffordanceEnabled();

  const handleCopyToClipboard = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      const success = await copy(value);
      if (success) {
        onCopy?.(value);
      }
    },
    [value, onClick, onCopy, copy],
  );

  if (!affordanceEnabled) {
    return null;
  }

  return (
    <Button
      aria-label={ariaLabel || "Copy to clipboard"}
      className={cn("group/copy", className)}
      data-copied={isCopied}
      onClick={handleCopyToClipboard}
      {...props}
    >
      {children ??
        (isCopied ? (
          <CheckIcon className="hidden size-4 group-data-[copied=true]/copy:block" />
        ) : (
          <CopyIcon className="size-4 group-data-[copied=true]/copy:hidden" />
        ))}
    </Button>
  );
}
