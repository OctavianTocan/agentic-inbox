"use client";

import { cn } from "../../../../lib/utils";
import { ExternalLinkIcon } from "../../../icons";
import {
  HybridHoverCard,
  HybridHoverCardContent,
  HybridHoverCardTrigger,
} from "../../hybrid-hover-card";

const EXTERNAL_URL_REGEX = /^https?:\/\//i;

type DataTableLinkCellProps = React.ComponentProps<"a"> & {
  href: string;
  label?: string;
  showHoverCard?: boolean;
  showExternalIcon?: boolean;
  isExternal?: boolean;
};

/** Table cell rendering a link with optional external-target handling and a URL hover card. */
export function DataTableLinkCell({
  href,
  label,
  className,
  children,
  showHoverCard = true,
  showExternalIcon = true,
  isExternal,
  ...props
}: DataTableLinkCellProps) {
  const display = label ?? children ?? href;
  const computedExternal = isExternal ?? EXTERNAL_URL_REGEX.test(href);
  const rel = computedExternal ? "noreferrer noopener" : props.rel;
  const target = computedExternal ? "_blank" : props.target;

  const linkProps = {
    className: cn(
      "inline-flex max-w-full items-center gap-1 truncate",
      className,
    ),
    href,
    rel,
    target,
    ...props,
  };

  const linkChildren = (
    <>
      <span className="truncate">{display}</span>
      {computedExternal && showExternalIcon ? (
        <ExternalLinkIcon
          aria-hidden
          className="size-3.5 shrink-0 text-foreground/60"
        />
      ) : null}
    </>
  );

  if (!showHoverCard) {
    return <a {...linkProps}>{linkChildren}</a>;
  }

  return (
    <HybridHoverCard>
      <HybridHoverCardTrigger
        delay={200}
        render={<a {...linkProps}>{linkChildren}</a>}
      />
      <HybridHoverCardContent align="start" className="max-w-96">
        <div className="break-words text-xs">{href}</div>
      </HybridHoverCardContent>
    </HybridHoverCard>
  );
}

export type { DataTableLinkCellProps };
