import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../../lib/utils";

type CardProps = Omit<ComponentProps<"a">, "title"> & {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly href: string;
};

/**
 * Clickable docs card with optional icon, title, and description.
 *
 * @param props - Card content and link target.
 * @param props.title - Visible card title.
 * @param props.description - Optional supporting text below the title.
 * @param props.icon - Optional leading icon node.
 * @param props.href - Destination URL.
 * @param props.className - Extra classes merged with the base card styles.
 * @returns The rendered link card.
 */
export function Card({
  title,
  description,
  icon,
  href,
  className,
  ...props
}: CardProps) {
  return (
    <Link
      className={cn(
        "group not-prose flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground transition-colors hover:bg-accent/50",
        className,
      )}
      data-slot="docs-card"
      href={href}
      {...props}
    >
      {icon && (
        <span
          className="text-muted-foreground [&_svg]:size-4"
          data-slot="docs-card-icon"
        >
          {icon}
        </span>
      )}
      <span className="font-medium text-sm" data-slot="docs-card-title">
        {title}
      </span>
      {description && (
        <span
          className="text-muted-foreground text-sm"
          data-slot="docs-card-description"
        >
          {description}
        </span>
      )}
    </Link>
  );
}
