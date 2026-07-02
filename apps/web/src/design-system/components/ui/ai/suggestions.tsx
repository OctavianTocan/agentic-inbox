"use client";

import {
  Suggestion as SuggestionPrimitive,
  type SuggestionProps,
  Suggestions as SuggestionsPrimitive,
  type SuggestionsProps,
} from "@/ai-ui/ui/suggestions";
import { cn } from "../../../lib/utils";

/**
 * Styled container for suggestion buttons, centered with wrapping.
 */
export function Suggestions({ className, ...props }: SuggestionsProps) {
  return (
    <SuggestionsPrimitive
      className={cn("flex flex-wrap justify-center gap-2", className)}
      {...props}
    />
  );
}

/**
 * Styled suggestion pill button. Submits the label text as a message
 * when clicked, or calls the custom onClick handler.
 */
export function Suggestion({ className, ...props }: SuggestionProps) {
  return (
    <SuggestionPrimitive
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm [&_svg]:size-4",
        "transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}
