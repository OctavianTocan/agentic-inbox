"use client";

import type { PropsWithChildren } from "react";

export interface ThreadProps extends PropsWithChildren {
  className?: string;
}

/**
 * Container for a chat thread. Renders a plain `<div>` with `data-slot="thread"`
 * so consumers can style it however they like.
 */
function Thread({ children, className }: ThreadProps) {
  return (
    <div className={className} data-slot="thread">
      {children}
    </div>
  );
}

export { Thread };
