import { cn } from "../../lib/utils";

/** Vertical container that stacks a page section's content. */
export function Section({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {children}
    </section>
  );
}

/** Heading block of a `Section`, stacking its title and description. */
export function SectionHeader({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  );
}

/** Header layout that lines up a `Section` title beside trailing actions. */
export function SectionHeaderRow({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Muted supporting text shown beneath a `SectionTitle`. */
export function SectionDescription({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)} {...props}>
      {children}
    </p>
  );
}

/** Primary heading of a `Section`. */
export function SectionTitle({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <h2 className={cn("font-medium text-lg", className)} {...props}>
      {children}
    </h2>
  );
}

/** Centered page wrapper that stacks several `Section`s with consistent spacing. */
export function SectionGroup({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-4xl space-y-8 px-4 py-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Heading block of a `SectionGroup`. */
export function SectionGroupHeader({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
}

/** Top-level page heading of a `SectionGroup`. */
export function SectionGroupTitle({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <h1 className={cn("font-bold text-4xl", className)} {...props}>
      {children}
    </h1>
  );
}
