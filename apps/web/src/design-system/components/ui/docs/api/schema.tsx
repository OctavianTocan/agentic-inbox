import type { OpenAPIV3_1 } from "openapi-types";
import { cn } from "../../../../lib/utils";

type SchemaOrRef = OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
type ResolveSchema = (
  node: SchemaOrRef,
  depth?: number,
) => OpenAPIV3_1.SchemaObject;

type SchemaProps = {
  readonly schema: OpenAPIV3_1.SchemaObject;
  readonly resolve: ResolveSchema;
  readonly required?: boolean;
  readonly className?: string;
};

const MAX_NESTED_DEPTH = 6;

/**
 * Renders an OpenAPI schema as a typed property tree. Refs are resolved
 * via the supplied `resolve` callback; nested objects render recursively
 * up to a depth cap.
 *
 * @param props - Schema and ref resolver.
 * @param props.schema - The fully-dereferenced schema to render.
 * @param props.resolve - Helper that resolves nested refs to schema objects.
 * @param props.required - When true, the field is marked required at the parent level.
 * @param props.className - Extra classes merged with the base layout.
 * @returns The rendered schema tree.
 */
export function Schema({ schema, resolve, required, className }: SchemaProps) {
  return (
    <div
      className={cn("not-prose space-y-3 text-sm", className)}
      data-slot="api-schema"
    >
      <SchemaNode
        depth={0}
        resolve={resolve}
        required={required}
        schema={schema}
      />
    </div>
  );
}

type SchemaNodeProps = {
  readonly schema: OpenAPIV3_1.SchemaObject;
  readonly resolve: ResolveSchema;
  readonly depth: number;
  readonly required?: boolean;
};

/** Recursively renders one schema node and its children. */
function SchemaNode({ schema, resolve, depth, required }: SchemaNodeProps) {
  if (depth > MAX_NESTED_DEPTH) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Nested schema truncated at depth {MAX_NESTED_DEPTH}.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <SchemaSummary required={required} schema={schema} />
      <SchemaBody depth={depth} resolve={resolve} schema={schema} />
    </div>
  );
}

type SchemaSummaryProps = {
  readonly schema: OpenAPIV3_1.SchemaObject;
  readonly required?: boolean;
};

/** Renders the type/format/required summary line for a schema. */
function SchemaSummary({ schema, required }: SchemaSummaryProps) {
  const typeLabel = describeType(schema);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
        {typeLabel}
      </code>
      {schema.format && (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
          {schema.format}
        </code>
      )}
      {required && (
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive uppercase">
          required
        </span>
      )}
      {schema.description && (
        <span className="text-muted-foreground">{schema.description}</span>
      )}
    </div>
  );
}

type SchemaBodyProps = {
  readonly schema: OpenAPIV3_1.SchemaObject;
  readonly resolve: ResolveSchema;
  readonly depth: number;
};

/** Renders the body of a schema based on its kind (object, array, union, etc.). */
function SchemaBody({ schema, resolve, depth }: SchemaBodyProps) {
  if (schema.enum) {
    return <SchemaEnum values={schema.enum} />;
  }

  if (schema.oneOf || schema.anyOf) {
    const variants = schema.oneOf ?? schema.anyOf;
    return (
      <SchemaVariants
        depth={depth}
        kind={schema.oneOf ? "oneOf" : "anyOf"}
        resolve={resolve}
        variants={variants ?? []}
      />
    );
  }

  if (schema.allOf) {
    const merged = mergeAllOf(schema.allOf, resolve);
    return <SchemaBody depth={depth} resolve={resolve} schema={merged} />;
  }

  if (schema.type === "array" && schema.items) {
    const itemSchema = resolve(schema.items);
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
          Array items
        </p>
        <SchemaNode depth={depth + 1} resolve={resolve} schema={itemSchema} />
      </div>
    );
  }

  if (schema.type === "object" && schema.properties) {
    return (
      <SchemaProperties
        depth={depth}
        properties={schema.properties}
        required={schema.required ?? []}
        resolve={resolve}
      />
    );
  }

  return null;
}

type SchemaPropertiesProps = {
  readonly properties: Readonly<Record<string, SchemaOrRef>>;
  readonly required: readonly string[];
  readonly resolve: ResolveSchema;
  readonly depth: number;
};

/** Renders the property list of an object schema. */
function SchemaProperties({
  properties,
  required,
  resolve,
  depth,
}: SchemaPropertiesProps) {
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return null;
  }
  const requiredSet = new Set(required);
  return (
    <ul className="divide-y rounded-md border bg-card">
      {entries.map(([name, propRef]) => {
        const propSchema = resolve(propRef);
        return (
          <li
            className="flex flex-col gap-1 p-3"
            data-slot="api-schema-property"
            key={name}
          >
            <code className="font-mono font-semibold text-sm">{name}</code>
            <SchemaNode
              depth={depth + 1}
              required={requiredSet.has(name)}
              resolve={resolve}
              schema={propSchema}
            />
          </li>
        );
      })}
    </ul>
  );
}

type SchemaEnumProps = {
  readonly values: readonly unknown[];
};

/** Renders an enum value list. */
function SchemaEnum({ values }: SchemaEnumProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value, index) => {
        const label = typeof value === "string" ? value : JSON.stringify(value);
        return (
          <code
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
            key={`${label}-${index.toString()}`}
          >
            {label}
          </code>
        );
      })}
    </div>
  );
}

type SchemaVariantsProps = {
  readonly variants: readonly SchemaOrRef[];
  readonly resolve: ResolveSchema;
  readonly kind: "oneOf" | "anyOf";
  readonly depth: number;
};

/** Renders alternatives for `oneOf` or `anyOf`. */
function SchemaVariants({
  variants,
  resolve,
  kind,
  depth,
}: SchemaVariantsProps) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {kind === "oneOf" ? "One of" : "Any of"}
      </p>
      <div className="space-y-2">
        {variants.map((variant, index) => {
          const resolved = resolve(variant);
          return (
            <SchemaNode
              depth={depth + 1}
              key={`variant-${index.toString()}`}
              resolve={resolve}
              schema={resolved}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Returns a human-readable type label for a schema node. */
function describeType(schema: OpenAPIV3_1.SchemaObject): string {
  if (schema.type) {
    if (Array.isArray(schema.type)) {
      return schema.type.join(" | ");
    }
    return schema.type;
  }
  if (schema.oneOf) {
    return "oneOf";
  }
  if (schema.anyOf) {
    return "anyOf";
  }
  if (schema.allOf) {
    return "allOf";
  }
  if (schema.enum) {
    return "enum";
  }
  return "unknown";
}

/** Shallow-merges `allOf` variants into a single object schema. */
function mergeAllOf(
  variants: readonly SchemaOrRef[],
  resolve: ResolveSchema,
): OpenAPIV3_1.SchemaObject {
  const merged: OpenAPIV3_1.SchemaObject = {
    type: "object",
    properties: {},
    required: [],
  };
  const required: string[] = [];
  const properties: Record<string, SchemaOrRef> = {};
  for (const variant of variants) {
    const resolved = resolve(variant);
    if (resolved.properties) {
      Object.assign(properties, resolved.properties);
    }
    if (resolved.required) {
      required.push(...resolved.required);
    }
  }
  merged.properties = properties;
  merged.required = required;
  return merged;
}
