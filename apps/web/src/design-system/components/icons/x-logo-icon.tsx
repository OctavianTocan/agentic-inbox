import type { SVGProps } from "react";

/**
 * X (Twitter) logo icon component
 *
 * Custom icon following the same API pattern as lucide icons.
 * Uses currentColor for automatic light/dark mode support.
 */
export function XLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="text-black dark:text-white"
      fill="none"
      height={24}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      width={24}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>X</title>
      <path d="m19 4-5.93 6.93M5 20l5.93-6.93m0 0 5.795 6.587c.19.216.483.343.794.343h1.474c.836 0 1.307-.85.793-1.435L13.07 10.93m-2.14 2.14L4.214 5.435C3.7 4.85 4.17 4 5.007 4h1.474c.31 0 .604.127.794.343l5.795 6.587" />
    </svg>
  );
}
