import type { SVGProps } from "react";
import { cn } from "../../lib/utils";

/** Agentic Inbox mark: the app icon's envelope in the current text colour; follows the lucide icon API. */
export function AgenticInboxIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn("text-foreground", className)}
      fill="none"
      viewBox="6 13 116 116"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Agentic Inbox</title>
      <path
        d="M21 39h86a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H21a8 8 0 0 1-8-8V47a8 8 0 0 1 8-8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={7}
      />
      <path
        d="M18 43 54 74a16 16 0 0 0 21 0l35-31"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={7}
      />
      <path d="M86 39h21a8 8 0 0 1 8 8v21L86 39Z" fill="currentColor" />
      <circle cx="95" cy="83" fill="currentColor" r="6" />
    </svg>
  );
}
