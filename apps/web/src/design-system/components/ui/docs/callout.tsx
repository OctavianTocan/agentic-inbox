import type { ComponentProps, ReactNode } from "react";

import {
  CircleCheckIcon,
  type Icon,
  InfoIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "../../../components/icons";
import { cn } from "../../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../alert";

type CalloutType =
  | "info"
  | "note"
  | "tip"
  | "warn"
  | "warning"
  | "success"
  | "error";

type CalloutProps = Omit<ComponentProps<typeof Alert>, "title"> & {
  readonly type?: CalloutType;
  readonly title?: ReactNode;
  readonly icon?: ReactNode;
};

const iconMap = {
  info: InfoIcon,
  note: InfoIcon,
  tip: InfoIcon,
  warn: TriangleAlertIcon,
  warning: TriangleAlertIcon,
  success: CircleCheckIcon,
  error: XCircleIcon,
} as const satisfies Record<CalloutType, Icon>;

const colorClass = {
  info: "*:[svg]:text-primary",
  note: "*:[svg]:text-primary",
  tip: "*:[svg]:text-primary",
  warn: "text-amber-700 *:[svg]:text-amber-600 dark:text-amber-300 dark:*:[svg]:text-amber-400",
  warning:
    "text-amber-700 *:[svg]:text-amber-600 dark:text-amber-300 dark:*:[svg]:text-amber-400",
  success:
    "text-emerald-700 *:[svg]:text-emerald-600 dark:text-emerald-300 dark:*:[svg]:text-emerald-400",
  error: "text-destructive *:[svg]:text-destructive",
} as const satisfies Record<CalloutType, string>;

/**
 * Inline callout block with semantic variants (info, warn, success, error, tip, note).
 * Wraps `Alert` and chooses the icon and accent color from `type`.
 *
 * @param props - Callout content and type.
 * @param props.type - Semantic variant. Defaults to `info`.
 * @param props.title - Optional bold title rendered above the body.
 * @param props.icon - Override icon. Falls back to the type-specific icon.
 * @param props.children - Body content rendered inside `AlertDescription`.
 * @param props.className - Extra classes merged with the base alert styles.
 * @returns The rendered callout.
 */
export function Callout({
  type = "info",
  title,
  icon,
  children,
  className,
  ...props
}: CalloutProps) {
  const Icon = iconMap[type];
  return (
    <Alert
      className={cn("my-6", colorClass[type], className)}
      data-slot="docs-callout"
      data-type={type}
      {...props}
    >
      {icon ?? <Icon />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
