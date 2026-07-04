import type { OpenAPIV3_1 } from "openapi-types";
import { cn } from "../../../../lib/utils";
import { APIInfo, type HttpMethod } from "./api-info";
import { AuthInfo, type AuthScheme } from "./auth-info";
import { CodeSamples } from "./code-samples";
import { Parameters } from "./parameters";
import { Playground } from "./playground";
import { Responses } from "./responses";
import { Schema } from "./schema";

type SchemaOrRef = OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
type ResolveSchema = (
  node: SchemaOrRef,
  depth?: number,
) => OpenAPIV3_1.SchemaObject;
type ResolveRequestBody = (
  node: OpenAPIV3_1.RequestBodyObject | OpenAPIV3_1.ReferenceObject,
) => OpenAPIV3_1.RequestBodyObject;
type ResolveResponse = (
  node: OpenAPIV3_1.ResponseObject | OpenAPIV3_1.ReferenceObject,
) => OpenAPIV3_1.ResponseObject;
type ResolveParameter = (
  node: OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject,
) => OpenAPIV3_1.ParameterObject;

type APIPageOperation = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly operationId: string;
  readonly summary?: string;
  readonly description?: string;
  readonly operation: OpenAPIV3_1.OperationObject;
};

export type APIPageProps = {
  readonly operation: APIPageOperation;
  readonly baseUrl: string;
  readonly securitySchemes: Readonly<Record<string, AuthScheme>>;
  readonly resolveSchema: ResolveSchema;
  readonly resolveResponse: ResolveResponse;
  readonly resolveRequestBody: ResolveRequestBody;
  readonly resolveParameter: ResolveParameter;
  readonly className?: string;
};

/**
 * Composes the operation page: header, parameters, request body, responses,
 * code samples, and the interactive playground.
 *
 * @param props - Operation, base URL, security schemes, and ref resolvers.
 * @param props.operation - The operation to render.
 * @param props.baseUrl - API base URL used for code samples and the playground.
 * @param props.securitySchemes - Map of security scheme name to definition.
 * @param props.resolveSchema - Resolver for schema refs.
 * @param props.resolveResponse - Resolver for response refs.
 * @param props.resolveRequestBody - Resolver for request-body refs.
 * @param props.resolveParameter - Resolver for parameter refs.
 * @param props.className - Extra classes merged with the base layout.
 * @returns The composed operation page.
 */
export function APIPage({
  operation,
  baseUrl,
  securitySchemes,
  resolveSchema,
  resolveResponse,
  resolveRequestBody,
  resolveParameter,
  className,
}: APIPageProps) {
  const op = operation.operation;
  const security = op.security ?? [];
  const isPublic = security.length === 0;
  const parameters = (op.parameters ?? []).map((param) =>
    resolveParameter(param),
  );
  const requestBody = op.requestBody
    ? resolveRequestBody(op.requestBody)
    : undefined;
  const responses = Object.fromEntries(
    Object.entries(op.responses ?? {}).map(([status, response]) => [
      status,
      resolveResponse(response),
    ]),
  );

  return (
    <div
      className={cn("grid gap-12 lg:grid-cols-2", className)}
      data-slot="api-page"
    >
      <div className="space-y-8">
        <header className="not-prose space-y-3">
          <APIInfo method={operation.method} path={operation.path} />
          <h1 className="font-display font-semibold text-3xl">
            {operation.summary ?? operation.operationId}
          </h1>
          {operation.description && (
            <p className="text-muted-foreground">{operation.description}</p>
          )}
        </header>
        {!isPublic && (
          <AuthInfo required={security} schemes={securitySchemes} />
        )}
        <Parameters parameters={parameters} resolve={resolveSchema} />
        {requestBody && (
          <RequestBodySection
            requestBody={requestBody}
            resolve={resolveSchema}
          />
        )}
        <Responses resolve={resolveSchema} responses={responses} />
      </div>
      <div className="space-y-6 lg:sticky lg:top-(--top-bar-height) lg:self-start">
        <CodeSamples
          baseUrl={baseUrl}
          hasAuth={!isPublic}
          method={operation.method}
          parameters={parameters}
          path={operation.path}
          requestBody={requestBody}
          resolveSchema={resolveSchema}
        />
        <Playground
          baseUrl={baseUrl}
          hasAuth={!isPublic}
          hasRequestBody={requestBody !== undefined}
          method={operation.method}
          parameters={parameters}
          path={operation.path}
        />
      </div>
    </div>
  );
}

type RequestBodySectionProps = {
  readonly requestBody: OpenAPIV3_1.RequestBodyObject;
  readonly resolve: ResolveSchema;
};

/** Renders the request body section: description plus the JSON schema. */
function RequestBodySection({ requestBody, resolve }: RequestBodySectionProps) {
  const json = requestBody.content?.["application/json"];
  if (!json?.schema) {
    return null;
  }
  const schema = resolve(json.schema);
  return (
    <section className="not-prose space-y-3" data-slot="api-request-body">
      <h2 className="font-semibold text-base">Request body</h2>
      {requestBody.description && (
        <p className="text-muted-foreground text-sm">
          {requestBody.description}
        </p>
      )}
      <Schema
        required={requestBody.required}
        resolve={resolve}
        schema={schema}
      />
    </section>
  );
}
