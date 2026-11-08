"use client";

import type { ComponentProps } from "react";
import type { ShortcutDefinition } from "../../lib/shortcuts";
import { ShortcutKbd } from "./shortcut-kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

type ShortcutTooltipProps = ComponentProps<typeof TooltipTrigger> & {
  label: string;
  shortcut?: ShortcutDefinition | null;
  side?: "top" | "right" | "bottom" | "left";
};

/** Tooltip whose content pairs a label with an optional keyboard shortcut hint. */
export function ShortcutTooltip({
  label,
  shortcut,
  side = "top",
  delay = 500,
  ...props
}: ShortcutTooltipProps) {
  return (
    <TooltipProvider delay={delay}>
      <Tooltip>
        <TooltipTrigger delay={delay} {...props} />
        <TooltipContent side={side}>
          <span className="flex items-center gap-2">
            {label}
            {shortcut && <ShortcutKbd shortcut={shortcut} />}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
