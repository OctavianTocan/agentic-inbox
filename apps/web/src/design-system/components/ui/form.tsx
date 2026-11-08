"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form";
import { cn } from "../../lib/utils";
import { Label } from "./label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(
  undefined,
);

/** Binds a single form field to react-hook-form and exposes its name to descendants. */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider
      value={React.useMemo(() => ({ name: props.name }), [props.name])}
    >
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/**
 * Reads the current field and item context to expose the field's name, state, and the element ids that wire label, control, description, and message together.
 *
 * @returns The field id, name, validation state, and the `htmlFor`/`aria` ids for the field's slots.
 * @throws Error when rendered outside a `<FormField>` and `<FormItem>`.
 */
const useFormField = () => {
  const fieldContext = React.use(FormFieldContext);
  const itemContext = React.use(FormItemContext);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | undefined>(
  undefined,
);

/** Field wrapper that establishes a unique id for its label, control, and messages. */
function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={React.useMemo(() => ({ id }), [id])}>
      <div
        className={cn("grid gap-2", className)}
        data-slot="form-item"
        {...props}
      />
    </FormItemContext.Provider>
  );
}

/** Label for the current field; reflects the field's error state and targets its control. */
function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      className={cn("data-[error=true]:text-destructive", className)}
      data-error={!!error}
      data-slot="form-label"
      htmlFor={formItemId}
      {...props}
    />
  );
}

/** Renders the field's interactive control, wiring its id and aria attributes to the field state. */
function FormControl({ render, ...props }: useRender.ComponentProps<"div">) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "aria-describedby": error
          ? `${formDescriptionId} ${formMessageId}`
          : `${formDescriptionId}`,
        "aria-invalid": !!error || undefined,
        id: formItemId,
      },
      props,
    ),
    render,
    state: {
      slot: "form-control",
    },
  });
}

/** Helper text describing the current field. */
function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="form-description"
      id={formDescriptionId}
      {...props}
    />
  );
}

/** Validation message for the current field; renders the field error or `children`, or nothing when empty. */
function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      className={cn("text-destructive text-sm", className)}
      data-slot="form-message"
      id={formMessageId}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};
