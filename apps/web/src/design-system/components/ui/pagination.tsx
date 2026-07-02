import type * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "@/design-system/components/icons";
import { cn } from "../../lib/utils";
import { Button } from "./button";

/** Navigation landmark wrapping a set of pagination controls. */
function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      data-slot="pagination"
      {...props}
    />
  );
}

/** Row that lays out `PaginationItem`s within a `Pagination`. */
function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex items-center gap-0.5", className)}
      data-slot="pagination-content"
      {...props}
    />
  );
}

/** List item holding a single pagination control. */
function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

/** Anchor rendered as a button-styled pagination link. */
function PaginationLink({
  className,
  isActive,
  size = "icon",
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      className={cn(className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? "page" : undefined}
          data-active={isActive}
          data-slot="pagination-link"
          {...props}
        >
          {children}
        </a>
      }
      size={size}
      variant={isActive ? "outline" : "ghost"}
    />
  );
}

/** Pagination link to the previous page. */
function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn("pl-1.5!", className)}
      size="default"
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  );
}

/** Pagination link to the next page. */
function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn("pr-1.5!", className)}
      size="default"
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  );
}

/** Ellipsis placeholder marking skipped pages in a `Pagination`. */
function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      data-slot="pagination-ellipsis"
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
