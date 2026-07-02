"use client";

import type * as React from "react";
import { cn } from "../../../lib/utils";
import { CardFooter } from "../card";

type FormSubmitBarProps = React.ComponentProps<"div"> & {
  /** Optional muted helper text rendered on the left side of the bar. */
  hint?: React.ReactNode;
  /**
   * Layout mode.
   * - `default`: in-card footer band styled like `<CardFooter>`; drop into a `<Card>`.
   * - `sticky`: sticks to the bottom of its scroll container; drop into `<AppShellContent>`
   *   after the form body for long forms.
   */
  variant?: "default" | "sticky";
};

/**
 * Footer bar for form actions: optional muted hint on the left, action buttons on the right.
 * Pair with `<FormSubmitBarSubmit>` and `<FormSubmitBarCancel>` to wire RHF state automatically.
 *
 * For the submit button to track validity in real time, set `mode: 'onChange'` on the
 * consumer's `useForm({...})` call.
 *
 * @param props - The component props.
 * @param props.hint - Optional helper text rendered to the left of the action buttons.
 * @param props.variant - `default` for an in-card footer band; `sticky` for a page-level sticky bar.
 * @param props.children - Action buttons (typically `<FormSubmitBarCancel>` and `<FormSubmitBarSubmit>`).
 * @returns A footer bar containing a hint slot and an action button slot.
 */
function FormSubmitBar({
  className,
  hint,
  variant = "default",
  children,
  ...props
}: FormSubmitBarProps) {
  const content = (
    <>
      {hint ? (
        <span className="text-muted-foreground text-sm">{hint}</span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </>
  );
  if (variant === "sticky") {
    return (
      <div
        className={cn(
          "sticky bottom-0 z-10 flex items-center gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur",
          className,
        )}
        data-slot="form-submit-bar"
        data-variant="sticky"
        {...props}
      >
        {content}
      </div>
    );
  }
  return (
    <CardFooter
      className={cn("gap-4", className)}
      data-variant="default"
      {...props}
    >
      {content}
    </CardFooter>
  );
}

export { FormSubmitBar };
