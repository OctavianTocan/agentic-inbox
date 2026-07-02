/**
 * Copied from https://github.com/shadcn-ui/ui/issues/2402#issuecomment-1930895113
 */
"use client";

import {
  type ComponentProps,
  createContext,
  use,
  useSyncExternalStore,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const TouchContext = createContext<boolean | undefined>(undefined);
/** Returns whether the device uses a coarse (touch) pointer, or `undefined` before hydration. */
export const useTouch = () => use(TouchContext);

/** Subscribes to pointer-coarse media query changes. */
function subscribeTouchQuery(onStoreChange: () => void) {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

/** Reads the current coarse-pointer match from the browser. */
function getTouchSnapshot() {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Returns undefined on the server so the first client render matches SSR. */
function getTouchServerSnapshot() {
  return undefined as boolean | undefined;
}

/** Makes the device's touch-pointer state available to descendant hybrid tooltips without hydration flicker. */
export const HybridTooltipProvider = ({
  children,
  ...props
}: ComponentProps<typeof TooltipProvider>) => {
  const isTouch = useSyncExternalStore(
    subscribeTouchQuery,
    getTouchSnapshot,
    getTouchServerSnapshot,
  );

  return (
    <TooltipProvider {...props}>
      <TouchContext.Provider value={isTouch}>{children}</TouchContext.Provider>
    </TooltipProvider>
  );
};

/** Tooltip that falls back to a popover on touch devices. */
export const HybridTooltip = (
  props: ComponentProps<typeof Tooltip> & ComponentProps<typeof Popover>,
) => {
  const isTouch = useTouch();

  return isTouch ? <Popover {...props} /> : <Tooltip {...props} />;
};

/** Trigger for the hybrid tooltip, falling back to a popover trigger on touch devices. */
export const HybridTooltipTrigger = (
  props: ComponentProps<typeof TooltipTrigger> &
    ComponentProps<typeof PopoverTrigger>,
) => {
  const isTouch = useTouch();

  return isTouch ? (
    <PopoverTrigger {...props} />
  ) : (
    <TooltipTrigger {...props} />
  );
};

/** Content for the hybrid tooltip, rendered as a popover on touch devices. */
export const HybridTooltipContent = (
  props: ComponentProps<typeof TooltipContent> &
    ComponentProps<typeof PopoverContent>,
) => {
  const isTouch = useTouch();

  return isTouch ? (
    <PopoverContent {...props} />
  ) : (
    <TooltipContent {...props} />
  );
};
