"use client";

import {
  type ComponentPropsWithoutRef,
  type SyntheticEvent,
  useCallback,
  useState,
} from "react";
import { Maximize2Icon } from "@/design-system/components/icons";
import { cn } from "../../../lib/utils";
import { Button } from "../button";
import { CopyButton } from "../copy-button";
import { Img } from "../img";
import {
  type MarkdownMediaContentSize,
  MarkdownMediaViewer,
} from "./markdown-media-viewer";

export type MarkdownImageProps = ComponentPropsWithoutRef<"img"> & {
  node?: unknown;
};

/**
 * `<img>` renderer for the markdown component map with a click-to-zoom viewer.
 *
 * @param props - Component props.
 * @param props.alt - Alternative text, also used as the zoom viewer title.
 * @param props.className - Additional CSS class names for the rendered image.
 * @param props.loading - Image loading strategy; defaults to lazy.
 * @param props.onLoad - Called after the image finishes loading.
 */
export function MarkdownImage({
  alt,
  className,
  loading,
  node: _node,
  onLoad,
  ...props
}: MarkdownImageProps) {
  const [open, setOpen] = useState(false);
  const [contentSize, setContentSize] = useState<MarkdownMediaContentSize>();
  const copyValue = typeof props.src === "string" ? props.src : undefined;

  const handleLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const { naturalHeight, naturalWidth } = event.currentTarget;
      if (naturalWidth > 0 && naturalHeight > 0) {
        setContentSize((previous) => {
          if (
            previous?.width === naturalWidth &&
            previous.height === naturalHeight
          ) {
            return previous;
          }

          return { width: naturalWidth, height: naturalHeight };
        });
      }
      onLoad?.(event);
    },
    [onLoad],
  );

  return (
    <>
      <span
        className="group/image not-prose relative my-4 block w-fit max-w-full overflow-hidden rounded-xl bg-muted/35 p-1.5 shadow-xs ring-1 ring-border/70"
        data-slot="markdown-image"
      >
        <button
          aria-label="Open image in zoom view"
          className="block max-w-full cursor-zoom-in overflow-hidden rounded-lg outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
          data-slot="markdown-image-trigger"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Img
            alt={alt ?? ""}
            className={cn("h-auto max-w-full rounded-lg", className)}
            loading={loading ?? "lazy"}
            onLoad={handleLoad}
            {...props}
          />
        </button>
        <span
          aria-label="Image actions"
          className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-background/95 opacity-0 shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-opacity group-focus-within/image:opacity-100 group-hover/image:opacity-100"
          data-slot="markdown-image-actions"
        >
          <Button
            aria-label="Open image in zoom view"
            onClick={() => setOpen(true)}
            size="icon-sm"
            variant="ghost"
          >
            <Maximize2Icon className="size-4" />
          </Button>
          {copyValue && (
            <CopyButton
              aria-label="Copy image"
              size="icon-sm"
              value={copyValue}
              variant="ghost"
            />
          )}
        </span>
      </span>
      <MarkdownMediaViewer
        contentSize={contentSize}
        copyLabel="Copy image"
        copyValue={copyValue}
        maxFitScale={1}
        mediaClassName="[&>img]:max-w-none"
        onOpenChange={setOpen}
        open={open}
        title={alt ? `${alt} image` : "Image"}
      >
        <Img
          alt={alt ?? ""}
          className={cn("h-auto max-w-none rounded-lg", className)}
          draggable={false}
          loading="eager"
          onLoad={handleLoad}
          {...props}
        />
      </MarkdownMediaViewer>
    </>
  );
}
