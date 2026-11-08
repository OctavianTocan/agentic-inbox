import type { OpenAPIV3_1 } from "openapi-types";
import { cn } from "../../../../lib/utils";
import { Schema } from "./schema";

type SchemaOrRef = OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
type ResolveSchema = (
  node: SchemaOrRef,
  depth?: number,
) => OpenAPIV3_1.SchemaObject;

type ParametersProps = {
  readonly parameters: readonly OpenAPIV3_1.ParameterObject[];
  readonly resolve: ResolveSchema;
  readonly className?: string;
};

const groupOrder = ["path", "query", "header", "cookie"] as const;
type ParameterLocation = (typeof groupOrder)[number];

const groupLabel: Record<ParameterLocation, string> = {
  path: "Path parameters",
  query: "Query parameters",
  header: "Header parameters",
  cookie: "Cookie parameters",
};

/**
 * Renders all parameters for an operation, grouped by location.
 *
 * @param props - Resolved parameter list and ref resolver.
 * @param props.parameters - The operation's parameters with refs already resolved.
 * @param props.resolve - Helper that resolves nested schema refs.
 * @param props.className - Extra classes merged with the base layout.
 * @returns The rendered parameter sections, or `null` when no parameters exist.
 */
export function Parameters({
  parameters,
  resolve,
  className,
}: ParametersProps) {
  if (parameters.length === 0) {
    return null;
  }

  const grouped = groupOrder.flatMap((location) => {
    const items = parameters.filter((param) => param.in === location);
    return items.length > 0 ? [{ location, items }] : [];
  });

  if (grouped.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("not-prose space-y-6", className)}
      data-slot="api-parameters"
    >
      {grouped.map((group) => (
        <div className="space-y-3" key={group.location}>
          <h2 className="font-semibold text-base">
            {groupLabel[group.location]}
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {group.items.map((param) => {
              const schema = param.schema ? resolve(param.schema) : {};
              return (
                <li
                  className="flex flex-col gap-2 p-3"
                  data-slot="api-parameter"
                  key={`${param.in}-${param.name}`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <code className="font-mono font-semibold text-sm">
                      {param.name}
                    </code>
                    {param.required && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive text-xs uppercase">
                        required
                      </span>
                    )}
                    {param.deprecated && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs uppercase">
                        deprecated
                      </span>
                    )}
                  </div>
                  {param.description && (
                    <p className="text-muted-foreground text-sm">
                      {param.description}
                    </p>
                  )}
                  <Schema
                    required={param.required}
                    resolve={resolve}
                    schema={schema}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
