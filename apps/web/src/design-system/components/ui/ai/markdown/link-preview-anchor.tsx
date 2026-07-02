"use client";

import { Children, type ComponentProps, useEffect, useMemo } from "react";
import { AnimatedText } from "@/ai-ui/ui/animated-text";
import { getFaviconUrl, getHostname } from "../../../../lib/url";
import { cn } from "../../../../lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../hover-card";
import { Img } from "../../img";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";
import { useMarkdownSources } from "./markdown-sources-context";
import { type OgPreview, useOgPreview } from "./og-preview";

const PREVIEW_OPEN_DELAY_MS = 500;

/** Normalises an href to an http(s) URL string, or null when invalid. */
function parseValidUrl(href: unknown): string | null {
  if (typeof href !== "string") {
    return null;
  }
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Placeholder shown while preview metadata is loading. */
function PreviewSkeleton() {
  return <div className="aspect-[16/9] w-full animate-pulse bg-muted" />;
}

/** Hostname, title, and description row for a link preview card. */
function PreviewMeta({
  url,
  logo,
  title,
  description,
}: {
  url: string;
  logo?: string;
  title?: string;
  description?: string;
}) {
  const hostname = getHostname(url);
  const fallback = getFaviconUrl(url);
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Img
          alt=""
          className="size-3.5 shrink-0 rounded-sm"
          onError={(event) => {
            const target = event.currentTarget;
            if (target.src !== fallback) {
              target.src = fallback;
            }
          }}
          referrerPolicy="no-referrer"
          src={logo ?? fallback}
        />
        <span className="truncate">{hostname}</span>
      </div>
      {title && (
        <Tooltip>
          <TooltipTrigger
            delay={PREVIEW_OPEN_DELAY_MS}
            render={
              <div className="line-clamp-1 font-medium text-foreground text-sm" />
            }
          >
            {title}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            {title}
          </TooltipContent>
        </Tooltip>
      )}
      {description && (
        <Tooltip>
          <TooltipTrigger
            delay={PREVIEW_OPEN_DELAY_MS}
            render={
              <div className="line-clamp-2 text-muted-foreground text-xs leading-snug" />
            }
          >
            {description}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            {description}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/** Full preview card body: hero image (when present) plus metadata. */
function PreviewCardBody({ data, url }: { data: OgPreview; url: string }) {
  return (
    <>
      {data.image && (
        <div className="overflow-hidden">
          <Img
            alt=""
            className="aspect-[16/9] w-full bg-muted object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            referrerPolicy="no-referrer"
            src={data.image}
          />
        </div>
      )}
      <div className={cn(data.image && "border-border/50 border-t")}>
        <PreviewMeta
          description={data.description}
          logo={data.logo}
          title={data.title}
          url={url}
        />
      </div>
    </>
  );
}

/** Renders skeleton, bare metadata, or the full card based on fetch state. */
function PreviewBody({ url }: { url: string }) {
  const data = useOgPreview(url);

  if (data === undefined) {
    return <PreviewSkeleton />;
  }
  if (data === null) {
    return <PreviewMeta url={url} />;
  }
  return <PreviewCardBody data={data} url={url} />;
}

export type LinkPreviewAnchorProps = ComponentProps<"a"> & {
  animateChildren?: boolean;
};

/** Markdown anchor that registers its URL and shows an OpenGraph hover preview. */
export function LinkPreviewAnchor({
  animateChildren = true,
  className,
  children,
  href,
  ...props
}: LinkPreviewAnchorProps) {
  const validUrl = useMemo(() => parseValidUrl(href), [href]);
  const sources = useMarkdownSources();
  // Depend on the stable callbacks, not the context object: a register call
  // produces a fresh context value, so depending on `sources` would loop the effect.
  const register = sources?.register;
  const unregister = sources?.unregister;

  useEffect(() => {
    if (!(validUrl && register && unregister)) {
      return;
    }
    register(validUrl);
    return () => unregister(validUrl);
  }, [validUrl, register, unregister]);

  const animatedChildren = useMemo(
    () =>
      !animateChildren
        ? children
        : Children.map(children, (child) =>
            typeof child === "string" ? (
              <AnimatedText>{child}</AnimatedText>
            ) : (
              child
            ),
          ),
    [animateChildren, children],
  );

  const anchorProps = {
    ...props,
    className: cn("underline-offset-2", className),
    href,
    rel: "noopener noreferrer",
    target: "_blank",
  } as const;

  if (!validUrl) {
    return <a {...anchorProps}>{animatedChildren}</a>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={PREVIEW_OPEN_DELAY_MS}
        render={<a {...anchorProps}>{animatedChildren}</a>}
      />
      <HoverCardContent
        align="start"
        className="w-96 overflow-hidden p-0"
        sideOffset={6}
      >
        <a
          aria-label="Open link preview"
          className="group block transition-transform active:scale-[0.99]"
          href={validUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <PreviewBody url={validUrl} />
        </a>
      </HoverCardContent>
    </HoverCard>
  );
}
