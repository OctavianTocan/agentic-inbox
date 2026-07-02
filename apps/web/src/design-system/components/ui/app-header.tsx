"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { maxWidthVariants, useAppShellMaxWidth } from "./app-shell";

const appHeaderVariants = cva(
  "sticky top-(--top-bar-height) z-10 shrink-0 bg-background",
  {
    variants: {
      variant: {
        compact: "",
        title: "h-auto min-h-16 py-3",
      },
    },
    defaultVariants: {
      variant: "compact",
    },
  },
);

type AppHeaderProps = React.ComponentProps<"header"> &
  VariantProps<typeof maxWidthVariants> &
  VariantProps<typeof appHeaderVariants>;

/**
 * Sticky page header bar. The `compact` variant is a single fixed-height
 * row; `title` grows to fit a stacked title block. When a `maxWidth` is
 * set (directly or via the app shell) the content is width-constrained.
 */
function AppHeader({
  children,
  className,
  maxWidth,
  variant = "compact",
  ...props
}: AppHeaderProps) {
  const inheritedMaxWidth = useAppShellMaxWidth();
  const resolvedMaxWidth = maxWidth ?? inheritedMaxWidth ?? null;

  if (resolvedMaxWidth) {
    return (
      <header
        className={cn(appHeaderVariants({ variant }), className)}
        data-slot="app-header"
        {...props}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 px-4",
            maxWidthVariants({ maxWidth: resolvedMaxWidth }),
          )}
        >
          {children}
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        variant === "compact"
          ? "sticky top-(--top-bar-height) z-10 flex h-(--top-bar-height) shrink-0 items-center gap-2 bg-background px-2"
          : cn(
              appHeaderVariants({ variant }),
              "flex flex-wrap items-center gap-2 px-4",
            ),
        className,
      )}
      data-slot="app-header"
      {...props}
    >
      {children}
    </header>
  );
}

/** Leading content region of the header that grows to fill space. */
function AppHeaderContent({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 items-center gap-2", className)}
      data-slot="app-header-content"
      {...props}
    >
      {children}
    </div>
  );
}

/** Trailing action region pinned to the right of the header. */
function AppHeaderActions({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("ml-auto px-3", className)}
      data-slot="app-header-actions"
      {...props}
    >
      {children}
    </div>
  );
}

/** Vertical stack pairing a header title with its description. */
function AppHeaderGroup({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      data-slot="app-header-group"
      {...props}
    >
      {children}
    </div>
  );
}

type AppHeaderTitleProps = React.ComponentProps<"h1"> & {
  /**
   * Heading element to render. Defaults to `h1`. Pass `h2` to opt out of the
   * global `h1 { font-family: --font-family-display; ... }` rule defined in
   * `globals.css`; this is the convention for the integrations and
   * connections settings pages where the display font is undesirable.
   */
  as?: "h1" | "h2" | "h3" | "h4";
};

/** Page title heading for the header. */
function AppHeaderTitle({
  children,
  className,
  as: Tag = "h1",
  ...props
}: AppHeaderTitleProps) {
  return (
    <Tag
      className={cn("font-semibold text-lg", className)}
      data-slot="app-header-title"
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Muted supporting text shown beneath the header title. */
function AppHeaderDescription({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="app-header-description"
      {...props}
    >
      {children}
    </p>
  );
}

/** Secondary toolbar row below the header, width-constrained to the shell. */
function AppHeaderToolbar({
  children,
  className,
  maxWidth,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof maxWidthVariants>) {
  const inheritedMaxWidth = useAppShellMaxWidth();
  const resolvedMaxWidth = maxWidth ?? inheritedMaxWidth ?? "default";
  return (
    <div
      className={cn("bg-background", className)}
      data-slot="app-header-toolbar"
      {...props}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-2.5",
          maxWidthVariants({ maxWidth: resolvedMaxWidth }),
        )}
      >
        {children}
      </div>
    </div>
  );
}

type AppHeaderNavItem =
  | { type: "link"; label: string; href: string; render?: React.ReactElement }
  | { type: "page"; label: string };

/** Single muted link rendered within the header breadcrumb nav. */
function AppHeaderNavLink({
  href,
  render,
  className,
  ...props
}: useRender.ComponentProps<"a"> & { href: string }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        href,
        className: cn(
          "text-muted-foreground text-sm hover:text-foreground",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "app-header-nav-link",
    },
  });
}

/** Slash-separated breadcrumb nav built from link and page items. */
function AppHeaderNav({
  items,
  className,
  ...props
}: { items: AppHeaderNavItem[] } & React.ComponentProps<"nav">) {
  return (
    <nav
      className={cn("hidden items-center gap-2 md:flex", className)}
      data-slot="app-header-nav"
      {...props}
    >
      {items.map((item) => (
        <div className="flex items-center" key={item.label}>
          {item.type === "link" ? (
            <AppHeaderNavLink href={item.href} render={item.render}>
              {item.label}
            </AppHeaderNavLink>
          ) : (
            <span className="font-medium text-sm">{item.label}</span>
          )}
          <span aria-hidden className="mx-2 text-muted-foreground">
            /
          </span>
        </div>
      ))}
    </nav>
  );
}

export type { AppHeaderNavItem };
export {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
  AppHeaderGroup,
  AppHeaderNav,
  AppHeaderTitle,
  AppHeaderToolbar,
};
