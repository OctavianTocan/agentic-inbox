import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

/**
 * `Card` preset tuned for a settings panel. Uses the lighter `border` treatment
 * (matching {@link SettingsRowGroup}) instead of `Card`'s default ring, so a
 * settings page reads consistently when both primitives sit side by side.
 */
function SettingsCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Card
      className={cn(
        "gap-4 overflow-hidden rounded-lg border pt-3 pb-0 ring-0",
        className,
      )}
      {...props}
    />
  );
}

/** Heading region of a `SettingsCard`. */
function SettingsCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <CardHeader className={cn(className)} {...props} />;
}

/** Title of a `SettingsCard`. */
function SettingsCardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <CardTitle className={cn("text-base", className)} {...props} />;
}

/** Supporting text beneath a `SettingsCardTitle`. */
function SettingsCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <CardDescription
      className={cn("max-w-prose text-sm", className)}
      {...props}
    />
  );
}

/** Trailing control slot in a `SettingsCardHeader`. */
function SettingsCardAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <CardAction className={cn("ml-auto", className)} {...props} />;
}

/** Body region of a `SettingsCard`. */
function SettingsCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <CardContent className={cn("py-0", className)} {...props} />;
}

/** Footer region of a `SettingsCard`, typically holding actions. */
function SettingsCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <CardFooter
      className={cn("gap-2 border-t rounded-b-lg bg-accent py-2!", className)}
      {...props}
    />
  );
}

/** Muted helper text shown in a `SettingsCardFooter`. */
function SettingsCardFooterText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

/** Bordered container that stacks `SettingsRow`s with dividers between them. */
function SettingsRowGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm",
        className,
      )}
      data-slot="settings-row-group"
      {...props}
    />
  );
}

/** `SettingsRow` style variants selectable by density. */
const settingsRowVariants = cva(
  "flex items-center justify-between gap-4 not-last:border-b",
  {
    variants: {
      density: {
        default: "min-h-16 px-4 py-3",
        compact: "min-h-12 px-4 py-2.5",
      },
    },
    defaultVariants: {
      density: "default",
    },
  },
);

type SettingsRowProps = React.ComponentProps<"div"> &
  VariantProps<typeof settingsRowVariants>;

/** Single labeled row within a `SettingsRowGroup`. */
function SettingsRow({ className, density, ...props }: SettingsRowProps) {
  return (
    <div
      className={cn(settingsRowVariants({ density }), className)}
      data-slot="settings-row"
      {...props}
    />
  );
}

/** Leading text column of a `SettingsRow`, stacking title and description. */
function SettingsRowLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      data-slot="settings-row-label"
      {...props}
    />
  );
}

/** Title of a `SettingsRow`. */
function SettingsRowTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-medium text-sm", className)}
      data-slot="settings-row-title"
      {...props}
    />
  );
}

/** Supporting text beneath a `SettingsRowTitle`. */
function SettingsRowDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="settings-row-description"
      {...props}
    />
  );
}

/** Trailing control column of a `SettingsRow`. */
function SettingsRowAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      data-slot="settings-row-action"
      {...props}
    />
  );
}

/** Section heading for grouped settings. */
function SettingsSectionTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("flex h-8 items-center font-medium text-base", className)}
      data-slot="settings-section-title"
      {...props}
    >
      {children}
    </h2>
  );
}

export {
  SettingsCard,
  SettingsCardAction,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardFooterText,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsRow,
  SettingsRowAction,
  SettingsRowDescription,
  SettingsRowGroup,
  SettingsRowLabel,
  SettingsRowTitle,
  SettingsSectionTitle,
};
