"use client";

import type { ReactNode } from "react";
import { getFaviconUrl, getHostname } from "../../../lib/url";
import { cn } from "../../../lib/utils";
import { Img } from "../img";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../sheet";
import { useOgPreview } from "./markdown/og-preview";

export type SourceSheetProps = {
  /** Distinct URLs to list, in display order. */
  urls: readonly string[];
  /** The pill / button that opens the sheet. Rendered as the SheetTrigger. */
  trigger: ReactNode;
};

/**
 * Right-side drawer listing the URLs cited by an assistant message.
 * Each row is a clickable result with favicon, title, URL path, and
 * description.
 */
export function SourceSheet({ urls, trigger }: SourceSheetProps) {
  if (urls.length === 0) {
    return null;
  }
  return (
    <Sheet>
      <SheetTrigger render={<button aria-label="View sources" type="button" />}>
        {trigger}
      </SheetTrigger>
      <SheetContent
        className="flex flex-col gap-0 p-0 sm:max-w-md"
        side="right"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Sources</SheetTitle>
          <SheetDescription>
            {urls.length} {urls.length === 1 ? "reference" : "references"}
          </SheetDescription>
        </SheetHeader>
        <ul className="flex-1 divide-y overflow-y-auto">
          {urls.map((url) => (
            <li key={url}>
              <SourceSheetRow url={url} />
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

/** Single clickable result row for one cited URL. */
function SourceSheetRow({ url }: { url: string }) {
  const data = useOgPreview(url);
  const hostname = getHostname(url);
  const fallbackFavicon = getFaviconUrl(url);
  const path = getPath(url);
  const isLoading = data === undefined;
  const title = data?.title;
  const description = data?.description;
  const logo = data?.logo ?? fallbackFavicon;

  return (
    <a
      className="block px-4 py-3 transition-all hover:bg-muted/40 active:scale-[0.99]"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Img
            alt=""
            aria-hidden
            className="size-3.5 shrink-0 rounded-sm"
            onError={(event) => {
              const target = event.currentTarget;
              if (target.src !== fallbackFavicon) {
                target.src = fallbackFavicon;
              }
            }}
            referrerPolicy="no-referrer"
            src={logo}
          />
          <span className="truncate">{hostname}</span>
        </div>
        {title ? (
          <div className="line-clamp-1 font-medium text-foreground text-sm">
            {title}
          </div>
        ) : isLoading ? (
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        ) : null}
        {path && (
          <div className="line-clamp-1 text-muted-foreground/80 text-xs">
            {path}
          </div>
        )}
        {description ? (
          <div
            className={cn(
              "line-clamp-2 text-muted-foreground text-xs leading-snug",
            )}
          >
            {description}
          </div>
        ) : isLoading ? (
          <div className="space-y-1">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        ) : null}
      </div>
    </a>
  );
}

/** Host-prefixed path to show under a row, or null when the URL is a bare root. */
function getPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    if (path === "/" || path === "") {
      return null;
    }
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return null;
  }
}
