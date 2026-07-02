"use client";

import * as React from "react";

/**
 * Headless copy-to-clipboard button.
 *
 * Renders a plain `<button>` with `data-slot="copy-button"` and
 * `data-copied` when the value has just been copied. Provide your own
 * icon children and use the `data-copied` attribute to toggle visuals.
 */
export interface CopyButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick" | "onCopy"> {
  /** The text value to copy to the clipboard. */
  value: string;
  /** Called after a successful copy with the copied value. */
  onCopy?: (value: string) => void;
  /** Standard click handler — runs before copying. Prevent default to skip the copy. */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Duration in ms to keep `data-copied` active after copying. @default 1500 */
  timeout?: number;
}

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
  const [isCopied, setIsCopied] = React.useState(false);

  const copyToClipboard = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        onCopy?.(value);
        setTimeout(() => setIsCopied(false), timeout);
      } catch {
        // Clipboard write failed — silently ignore.
      }
    },
    [value, onClick, onCopy, timeout],
  );

  return (
    <button
      aria-label={ariaLabel || "Copy to clipboard"}
      className={className}
      data-copied={isCopied || undefined}
      data-slot="copy-button"
      onClick={copyToClipboard}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
