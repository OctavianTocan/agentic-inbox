"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
} from "@/design-system/components/icons";
import { cn } from "../../../lib/utils";
import { Button } from "../button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "../button-group";
import { CopyButton } from "../copy-button";
import {
  HybridDialog,
  HybridDialogContent,
  HybridDialogTitle,
} from "../hybrid-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";
import {
  type MarkdownMediaContentSize,
  useMarkdownMediaTransform,
} from "./use-markdown-media-transform";

export type { MarkdownMediaContentSize } from "./use-markdown-media-transform";

export type MarkdownMediaViewerProps = {
  children: ReactNode;
  contentSize?: MarkdownMediaContentSize | undefined;
  copyLabel?: string | undefined;
  copyValue?: string | undefined;
  /**
   * Cap for the auto-computed fit scale. Default unbounded (correct for
   * vector media); raster callers pass `1` to keep small images sharp.
   */
  maxFitScale?: number | undefined;
  mediaClassName?: string | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

/** Toolbar icon button paired with a tooltip describing its action. */
function ViewerButton({
  children,
  label,
  ...props
}: ComponentProps<typeof Button> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...props} />}>{children}</TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Full-screen dialog that displays media with pan, pinch, and zoom controls.
 *
 * @param props - Component props.
 * @param props.children - Media element to display inside the viewport.
 * @param props.contentSize - Intrinsic media size used to compute the fit scale.
 * @param props.copyLabel - Tooltip label for the copy-source control.
 * @param props.copyValue - Source value copied when the copy control is shown.
 * @param props.maxFitScale - Cap for the auto-computed fit scale.
 * @param props.mediaClassName - Additional CSS class names for the media container.
 * @param props.onOpenChange - Called when the dialog open state changes.
 * @param props.open - Whether the dialog is open.
 * @param props.title - Accessible title for the dialog.
 */
export function MarkdownMediaViewer({
  children,
  contentSize,
  copyLabel = "Copy source",
  copyValue,
  maxFitScale,
  mediaClassName,
  onOpenChange,
  open,
  title,
}: MarkdownMediaViewerProps) {
  const {
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleToggleFit,
    handleZoomIn,
    handleZoomOut,
    isInteracting,
    transform,
    viewMode,
    viewportRef,
  } = useMarkdownMediaTransform({ contentSize, maxFitScale, open });

  const toggleLabel = viewMode === "fit" ? "View actual size" : "Fit to view";
  const ToggleIcon = viewMode === "fit" ? MaximizeIcon : MinimizeIcon;

  return (
    <HybridDialog onOpenChange={onOpenChange} open={open}>
      <HybridDialogContent
        className="h-[min(90dvh,900px)] w-[min(95vw,1200px)] max-w-none overflow-hidden rounded-xl bg-background p-0 shadow-2xl sm:max-w-none md:max-h-none"
        data-slot="markdown-media-viewer"
      >
        <HybridDialogTitle className="sr-only">{title}</HybridDialogTitle>
        <TooltipProvider>
          <div
            className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-4.5rem)] items-center gap-2"
            data-slot="markdown-media-viewer-toolbar"
          >
            <ButtonGroup
              aria-label="Media controls"
              className="rounded-lg bg-background/95 shadow-sm ring-1 ring-foreground/10 backdrop-blur"
            >
              <ViewerButton
                aria-label={toggleLabel}
                label={toggleLabel}
                onClick={handleToggleFit}
                size="icon-sm"
                variant="ghost"
              >
                <ToggleIcon className="size-4" />
              </ViewerButton>
              <ButtonGroupSeparator />
              <ViewerButton
                aria-label="Zoom out"
                label="Zoom out"
                onClick={handleZoomOut}
                size="icon-sm"
                variant="ghost"
              >
                <MinusIcon className="size-4" />
              </ViewerButton>
              <ButtonGroupText className="min-w-11 justify-center border-transparent bg-transparent px-1 font-mono text-muted-foreground text-xs tabular-nums">
                {Math.round(transform.scale * 100)}%
              </ButtonGroupText>
              <ViewerButton
                aria-label="Zoom in"
                label="Zoom in"
                onClick={handleZoomIn}
                size="icon-sm"
                variant="ghost"
              >
                <PlusIcon className="size-4" />
              </ViewerButton>
              {copyValue && (
                <>
                  <ButtonGroupSeparator />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <CopyButton
                          aria-label={copyLabel}
                          size="icon-sm"
                          value={copyValue}
                          variant="ghost"
                        />
                      }
                    />
                    <TooltipContent sideOffset={8}>{copyLabel}</TooltipContent>
                  </Tooltip>
                </>
              )}
            </ButtonGroup>
          </div>
        </TooltipProvider>
        <div
          className={cn(
            "flex size-full touch-none items-center justify-center overflow-hidden overscroll-contain bg-muted/30 select-none",
            isInteracting ? "cursor-grabbing" : "cursor-grab",
          )}
          data-slot="markdown-media-viewer-viewport"
          onDoubleClick={handleDoubleClick}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={viewportRef}
        >
          <div
            className={cn(
              "flex max-w-none items-center justify-center",
              !isInteracting &&
                viewMode === "custom" &&
                "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
              mediaClassName,
            )}
            data-slot="markdown-media-viewer-content"
            style={{
              height: contentSize ? `${contentSize.height}px` : undefined,
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
              width: contentSize ? `${contentSize.width}px` : undefined,
            }}
          >
            {children}
          </div>
        </div>
      </HybridDialogContent>
    </HybridDialog>
  );
}
