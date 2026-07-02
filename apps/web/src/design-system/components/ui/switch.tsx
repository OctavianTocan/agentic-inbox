"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "../../lib/utils";

/** Toggle switch in three sizes. */
function Switch({
  className,
  size = "sm",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default" | "lg";
}) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-md border border-transparent outline-none transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18px] data-[size=lg]:h-[22px] data-[size=sm]:h-[14px] data-[size=default]:w-[32px] data-[size=lg]:w-[40px] data-[size=sm]:w-[24px] data-disabled:cursor-not-allowed data-checked:bg-primary data-unchecked:bg-muted-foreground/30 data-disabled:data-unchecked:bg-muted data-disabled:data-checked:bg-primary/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      data-size={size}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block rounded-sm bg-background ring-0 transition-transform group-data-disabled/switch:opacity-70 group-data-[size=default]/switch:size-4 group-data-[size=lg]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=lg]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=lg]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground"
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
