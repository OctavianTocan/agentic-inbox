"use client";

import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/** Container that lays out resizable panels in a row or column. */
function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className,
      )}
      data-slot="resizable-panel-group"
      {...props}
    />
  );
}

/** Resizable panel within a ResizablePanelGroup. */
function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

/** Drag handle between resizable panels. */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      className={cn(
        "relative flex w-px cursor-col-resize items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
        className,
      )}
      data-slot="resizable-handle"
      {...props}
    >
      {withHandle && (
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />
            }
          />
          <TooltipContent>Drag to resize</TooltipContent>
        </Tooltip>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
