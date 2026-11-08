import type { OpenAPIV3_1 } from "openapi-types";
import { cn } from "../../../../lib/utils";

export type AuthScheme = OpenAPIV3_1.SecuritySchemeObject;

type AuthInfoProps = {
  readonly schemes: Readonly<Record<string, AuthScheme>>;
  readonly required: readonly Readonly<Record<string, readonly string[]>>[];
  readonly className?: string;
};

/** Returns a human-readable label for an auth scheme. */
function describeScheme(scheme: AuthScheme): string {
  if (scheme.type === "http") {
    return scheme.scheme === "bearer"
      ? "Bearer token"
      : `HTTP ${scheme.scheme}`;
  }
  if (scheme.type === "apiKey") {
    if (scheme.in === "cookie") {
      return `Session cookie (${scheme.name})`;
    }
    return `API key (${scheme.in}: ${scheme.name})`;
  }
  if (scheme.type === "oauth2") {
    return "OAuth 2.0";
  }
  if (scheme.type === "openIdConnect") {
    return "OpenID Connect";
  }
  return "Authentication required";
}

/**
 * Lists the auth schemes accepted by an operation. Renders one row per
 * required scheme with a short hint about how to supply credentials.
 *
 * @param props - Security requirements and the schemes registered on the spec.
 * @param props.schemes - Map of scheme name to OpenAPI security scheme.
 * @param props.required - The operation's `security` array; each entry is an alternative.
 * @param props.className - Extra classes merged with the base layout.
 * @returns The rendered auth section, or `null` when no schemes are required.
 */
export function AuthInfo({ schemes, required, className }: AuthInfoProps) {
  if (required.length === 0) {
    return null;
  }
  const names = new Set<string>();
  for (const requirement of required) {
    for (const name of Object.keys(requirement)) {
      names.add(name);
    }
  }
  const entries = Array.from(names)
    .map((name) => ({ name, scheme: schemes[name] }))
    .filter(
      (entry): entry is { name: string; scheme: AuthScheme } =>
        entry.scheme !== undefined,
    );
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("not-prose space-y-2", className)}
      data-slot="api-auth-info"
    >
      <h2 className="font-semibold text-base">Authentication</h2>
      <ul className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm">
        {entries.map((entry) => (
          <li
            className="flex flex-col gap-0.5"
            data-slot="api-auth-info-item"
            key={entry.name}
          >
            <span className="font-medium">{describeScheme(entry.scheme)}</span>
            {entry.scheme.description && (
              <span className="text-muted-foreground text-xs">
                {entry.scheme.description}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
