"use client";

import { getFaviconUrl, getHostname } from "../../../lib/url";
import { cn } from "../../../lib/utils";
import { Badge } from "../badge";
import { IconStack } from "../icon-stack";
import { Img } from "../img";

const DEFAULT_MAX_VISIBLE = 3;

export type SourceStackProps = {
  urls: readonly string[];
  /** Visible favicon count cap. Default 3. */
  maxVisible?: number;
  /** Optional label override; defaults to `${urls.length} sources`. */
  label?: string;
  className?: string;
};

/**
 * Pill that summarises a list of cited URLs: the first `maxVisible`
 * favicons followed by a count label.
 */
export function SourceStack({
  urls,
  maxVisible = DEFAULT_MAX_VISIBLE,
  label,
  className,
}: SourceStackProps) {
  if (urls.length === 0) {
    return null;
  }
  const visible = urls.slice(0, maxVisible);
  const resolvedLabel =
    label ?? `${urls.length} ${urls.length === 1 ? "source" : "sources"}`;

  const items = visible.map((url) => (
    <Img
      alt=""
      aria-hidden
      className="size-3.5"
      key={url}
      referrerPolicy="no-referrer"
      src={getFaviconUrl(url)}
      title={getHostname(url)}
    />
  ));

  return (
    <Badge
      className={cn(
        "h-6 cursor-pointer gap-2 rounded-full px-2 hover:bg-foreground/10 hover:text-foreground",
        className,
      )}
      variant="secondary"
    >
      <IconStack items={items} />
      <span className="truncate">{resolvedLabel}</span>
    </Badge>
  );
}
