import { cn } from "../../lib/utils";

function ErrorPage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center bg-background text-foreground",
        className,
      )}
      data-slot="error-page"
      {...props}
    />
  );
}

function ErrorPageCode({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-muted-foreground text-xs uppercase tracking-[0.2em]",
        className,
      )}
      data-slot="error-page-code"
      {...props}
    />
  );
}

/** Page-level heading for error states. */
function ErrorPageTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "mt-6 text-balance font-display text-4xl text-foreground tracking-tight",
        className,
      )}
      data-slot="error-page-title"
      {...props}
    >
      {children}
    </h1>
  );
}

function ErrorPageDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mt-2 max-w-md text-pretty text-center text-muted-foreground text-sm",
        className,
      )}
      data-slot="error-page-description"
      {...props}
    />
  );
}

function ErrorPageActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-8 flex items-center gap-2", className)}
      data-slot="error-page-actions"
      {...props}
    />
  );
}

export {
  ErrorPage,
  ErrorPageActions,
  ErrorPageCode,
  ErrorPageDescription,
  ErrorPageTitle,
};
