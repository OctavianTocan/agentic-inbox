import { cn } from "../../../../lib/utils";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const methodColor: Record<HttpMethod, string> = {
  get: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  post: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  put: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  patch: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  delete: "bg-destructive/10 text-destructive",
};

type MethodBadgeProps = {
  readonly method: HttpMethod;
  readonly className?: string;
};

/**
 * Renders an HTTP method as a coloured monospace badge.
 *
 * @param props - Method and optional class overrides.
 * @param props.method - The HTTP verb to render.
 * @param props.className - Extra classes merged with the base badge styles.
 * @returns A method badge inline element.
 */
export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 font-mono font-medium text-xs uppercase",
        methodColor[method],
        className,
      )}
      data-slot="api-method-badge"
    >
      {method}
    </span>
  );
}

type APIInfoProps = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly className?: string;
};

/**
 * Renders the endpoint method-and-path strip shown at the top of an operation page.
 *
 * @param props - Method, path, and optional class overrides.
 * @param props.method - The HTTP verb for the endpoint.
 * @param props.path - The endpoint path template (e.g. `/v1/sessions/{id}`).
 * @param props.className - Extra classes merged with the base layout.
 * @returns The composed method-and-path strip.
 */
export function APIInfo({ method, path, className }: APIInfoProps) {
  return (
    <div
      className={cn(
        "not-prose flex items-center gap-3 rounded-lg border bg-card p-3 font-mono text-sm",
        className,
      )}
      data-slot="api-info"
    >
      <MethodBadge method={method} />
      <code className="text-foreground">{path}</code>
    </div>
  );
}
