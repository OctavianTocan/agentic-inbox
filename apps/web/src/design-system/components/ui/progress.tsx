"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "../../lib/utils";

/** Progress root rendering a track and indicator for the given `value`. */
function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      className={cn("flex flex-wrap gap-3", className)}
      data-slot="progress"
      value={value}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

/** Background rail of a `Progress` that the indicator fills. */
function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}

/** Filled bar of a `Progress` reflecting the current value. */
function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      className={cn("h-full bg-primary transition-all", className)}
      data-slot="progress-indicator"
      {...props}
    />
  );
}

/** Accessible label describing a `Progress`. */
function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("font-medium text-sm", className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

/** Text readout of a `Progress` value. */
function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-muted-foreground text-sm tabular-nums",
        className,
      )}
      data-slot="progress-value"
      {...props}
    />
  );
}

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
};
