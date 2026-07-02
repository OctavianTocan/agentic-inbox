"use client";

import { useCallback } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

export interface ScrollButtonProps extends React.ComponentProps<"button"> {
  showWhenAtBottom?: boolean;
}

/**
 * Headless scroll-to-bottom button driven by `useStickToBottomContext`.
 *
 * Exposes `data-visible` so consumers can style visibility transitions.
 * Renders no visual styles or icon — pass `className` for styling and
 * `children` for the icon content.
 */
export function ScrollButton({
  className,
  showWhenAtBottom = false,
  children,
  onClick,
  "aria-label": ariaLabel = "Scroll to bottom",
  ...props
}: ScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const isVisible = isAtBottom || showWhenAtBottom;

  const jumpToBottom = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) {
        return;
      }

      scrollToBottom();
    },
    [scrollToBottom, onClick],
  );

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      data-slot="scroll-button"
      data-visible={isVisible}
      onClick={jumpToBottom}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
