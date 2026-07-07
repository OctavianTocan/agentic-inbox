"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

type PointerTooltipSide = "top" | "right" | "bottom" | "left";

type PointerTooltipPoint = {
  readonly x: number;
  readonly y: number;
};

type PointerTooltipContentProps = {
  readonly point: PointerTooltipPoint | null;
  readonly children: ReactNode;
  readonly side?: PointerTooltipSide;
  readonly sideOffset?: number;
  readonly hidden?: boolean;
  readonly className?: string;
};

/** Shares hover-open timing across all tooltips within its subtree. */
function TooltipProvider({
  delay = 300,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

/** Root that pairs a trigger with its tooltip content. */
function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/** Element that reveals the tooltip on hover or focus. */
function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** Positioned, portalled tooltip popup with arrow and entrance animations. */
function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="isolate z-[80]"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            "data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 z-[80] w-fit max-w-xs origin-(--transform-origin) rounded-md bg-foreground px-3 py-1.5 text-background text-xs data-[state=delayed-open]:animate-in data-closed:animate-out data-open:animate-in",
            className,
          )}
          data-slot="tooltip-content"
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-[80] size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-start]:top-1/2! data-[side=left]:top-1/2! data-[side=right]:top-1/2! data-[side=inline-start]:-right-1 data-[side=left]:-right-1 data-[side=top]:-bottom-2.5 data-[side=inline-end]:-left-1 data-[side=right]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:-translate-y-1/2 data-[side=right]:-translate-y-1/2" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/** Tooltip bubble positioned from the latest pointer coordinates. */
function PointerTooltipContent({
  point,
  children,
  side = "right",
  sideOffset = 10,
  hidden = false,
  className,
}: PointerTooltipContentProps) {
  if (hidden || point === null) {
    return null;
  }

  const left =
    side === "right" ? point.x + sideOffset :
    side === "left" ? point.x - sideOffset :
    point.x;
  const top =
    side === "bottom" ? point.y + sideOffset :
    side === "top" ? point.y - sideOffset :
    point.y;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[80] w-fit max-w-xs rounded-md bg-foreground px-3 py-1.5 text-background text-xs shadow-sm",
        side === "right" && "-translate-y-1/2",
        side === "left" && "-translate-x-full -translate-y-1/2",
        side === "bottom" && "-translate-x-1/2",
        side === "top" && "-translate-x-1/2 -translate-y-full",
        className,
      )}
      data-slot="pointer-tooltip-content"
      style={{ left, top }}
    >
      {children}
    </div>
  );
}

export type { PointerTooltipPoint, PointerTooltipSide };
export {
  PointerTooltipContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
};
