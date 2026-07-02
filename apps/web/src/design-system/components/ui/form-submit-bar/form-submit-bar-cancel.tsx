"use client";

import type * as React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "../button";

type FormSubmitBarCancelProps = React.ComponentProps<typeof Button>;

/**
 * Cancel button for FormSubmitBar. Resets the form to its defaultValues.
 * Renders nothing when the form is pristine or currently submitting.
 */
function FormSubmitBarCancel({
  className,
  children = "Cancel",
  onClick,
  variant = "ghost",
  ...props
}: FormSubmitBarCancelProps) {
  const { reset, formState } = useFormContext();
  if (!formState.isDirty || formState.isSubmitting) {
    return null;
  }
  return (
    <Button
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        reset();
      }}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
}

export { FormSubmitBarCancel };
