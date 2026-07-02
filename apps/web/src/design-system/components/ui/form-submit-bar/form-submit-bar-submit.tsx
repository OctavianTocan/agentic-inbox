"use client";

import type * as React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "../../../lib/utils";
import { Button } from "../button";
import { Spinner } from "../spinner";

type FormSubmitBarSubmitProps = React.ComponentProps<typeof Button>;

/**
 * Submit button for FormSubmitBar. Disabled until the form is dirty and valid;
 * shows a spinner while the form is submitting.
 */
function FormSubmitBarSubmit({
  className,
  children,
  disabled,
  ...props
}: FormSubmitBarSubmitProps) {
  const { formState } = useFormContext();
  const isLoading = formState.isSubmitting;
  const isDisabled =
    disabled || isLoading || !formState.isDirty || !formState.isValid;
  return (
    <Button
      className={cn("group relative", className)}
      data-state={isLoading ? "loading" : undefined}
      disabled={isDisabled}
      type="submit"
      {...props}
    >
      <Spinner className="hidden group-data-[state=loading]:block" />
      {children}
    </Button>
  );
}

export { FormSubmitBarSubmit };
