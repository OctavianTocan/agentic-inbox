import type { OpenAPIV3_1 } from "openapi-types";
import { cn } from "../../../../lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../accordion";
import { Schema } from "./schema";

type SchemaOrRef = OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
type ResolveSchema = (
  node: SchemaOrRef,
  depth?: number,
) => OpenAPIV3_1.SchemaObject;

type ResponsesProps = {
  readonly responses: Readonly<Record<string, OpenAPIV3_1.ResponseObject>>;
  readonly resolve: ResolveSchema;
  readonly className?: string;
};

/**
 * Renders the response section as an accordion with one panel per status code.
 * Status codes are sorted ascending; default response renders last.
 *
 * @param props - Resolved response map and ref resolver.
 * @param props.responses - Map of status code (or `default`) to response object.
 * @param props.resolve - Helper that resolves nested schema refs.
 * @param props.className - Extra classes merged with the base layout.
 * @returns The rendered response section, or `null` when no responses exist.
 */
export function Responses({ responses, resolve, className }: ResponsesProps) {
  const entries = Object.entries(responses).sort(([a], [b]) => {
    if (a === "default") {
      return 1;
    }
    if (b === "default") {
      return -1;
    }
    return Number.parseInt(a, 10) - Number.parseInt(b, 10);
  });

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("not-prose space-y-3", className)}
      data-slot="api-responses"
    >
      <h2 className="font-semibold text-base">Responses</h2>
      <Accordion className="rounded-lg border bg-card">
        {entries.map(([status, response]) => (
          <AccordionItem
            className="px-3"
            data-slot="api-response"
            key={status}
            value={status}
          >
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                <span className="text-muted-foreground text-sm">
                  {response.description ?? ""}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <ResponseBody resolve={resolve} response={response} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

type StatusBadgeProps = {
  readonly status: string;
};

/** Renders a coloured badge for an HTTP status code or `default`. */
function StatusBadge({ status }: StatusBadgeProps) {
  const colour = statusColour(status);
  return (
    <code
      className={cn(
        "rounded px-2 py-0.5 font-mono font-medium text-xs",
        colour,
      )}
      data-slot="api-status-badge"
    >
      {status}
    </code>
  );
}

/** Returns Tailwind colour classes for a status code group. */
function statusColour(status: string): string {
  if (status === "default") {
    return "bg-muted text-muted-foreground";
  }
  const code = Number.parseInt(status, 10);
  if (code >= 200 && code < 300) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (code >= 300 && code < 400) {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
  }
  if (code >= 400 && code < 500) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return "bg-destructive/10 text-destructive";
}

type ResponseBodyProps = {
  readonly response: OpenAPIV3_1.ResponseObject;
  readonly resolve: ResolveSchema;
};

/** Renders the schema body for a response, picking the JSON content type when present. */
function ResponseBody({ response, resolve }: ResponseBodyProps) {
  const content = response.content;
  if (!content) {
    return <p className="text-muted-foreground text-sm">No response body.</p>;
  }

  const jsonEntry = content["application/json"] ?? Object.values(content)[0];

  if (!jsonEntry?.schema) {
    return (
      <p className="text-muted-foreground text-sm">
        Response has no declared schema.
      </p>
    );
  }

  const schema = resolve(jsonEntry.schema);
  return <Schema resolve={resolve} schema={schema} />;
}
