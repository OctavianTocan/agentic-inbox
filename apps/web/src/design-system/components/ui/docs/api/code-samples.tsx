import type { OpenAPIV3_1 } from "openapi-types";
import { CodeView } from "../../code-view/code-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";
import type { HttpMethod } from "./api-info";

type SchemaOrRef = OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
type ResolveSchema = (
  node: SchemaOrRef,
  depth?: number,
) => OpenAPIV3_1.SchemaObject;

type CodeSamplesProps = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly baseUrl: string;
  readonly hasAuth: boolean;
  readonly parameters: readonly OpenAPIV3_1.ParameterObject[];
  readonly requestBody?: OpenAPIV3_1.RequestBodyObject;
  readonly resolveSchema: ResolveSchema;
};

type Language = "curl" | "js" | "python" | "go";

const languages: readonly Language[] = ["curl", "js", "python", "go"];

const languageLabels: Record<Language, string> = {
  curl: "cURL",
  js: "JavaScript",
  python: "Python",
  go: "Go",
};

const languageHighlight: Record<Language, string> = {
  curl: "bash",
  js: "javascript",
  python: "python",
  go: "go",
};

/**
 * Renders runnable request samples in cURL, JavaScript, Python, and Go.
 *
 * @param props - Operation details and the schema resolver used to build samples.
 * @param props.method - HTTP method.
 * @param props.path - Endpoint path template.
 * @param props.baseUrl - API base URL prepended to the endpoint path.
 * @param props.hasAuth - Whether the operation requires authentication.
 * @param props.parameters - Resolved parameter list (path/query are substituted into samples).
 * @param props.requestBody - Resolved request body when the operation accepts one.
 * @param props.resolveSchema - Schema ref resolver used to produce sample payloads.
 * @returns A tabbed code-sample widget.
 */
export function CodeSamples({
  method,
  path,
  baseUrl,
  hasAuth,
  parameters,
  requestBody,
  resolveSchema,
}: CodeSamplesProps) {
  const url = buildSampleUrl(baseUrl, path, parameters);
  const sampleBody = sampleRequestBody(requestBody, resolveSchema);

  const samples: Record<Language, string> = {
    curl: generateCurl(method, url, hasAuth, sampleBody),
    js: generateJsFetch(method, url, hasAuth, sampleBody),
    python: generatePython(method, url, hasAuth, sampleBody),
    go: generateGo(method, url, hasAuth, sampleBody),
  };

  return (
    <Tabs defaultValue="curl">
      <TabsList variant="line">
        {languages.map((lang) => (
          <TabsTrigger key={lang} value={lang}>
            {languageLabels[lang]}
          </TabsTrigger>
        ))}
      </TabsList>
      {languages.map((lang) => (
        <TabsContent key={lang} value={lang}>
          <CodeView
            code={samples[lang]}
            copyButton
            language={languageHighlight[lang]}
            lineNumbers={false}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Builds the sample URL with path template placeholders left intact for clarity. */
function buildSampleUrl(
  baseUrl: string,
  path: string,
  parameters: readonly OpenAPIV3_1.ParameterObject[],
): string {
  const queryParams = parameters.flatMap((param) =>
    param.in === "query" && param.required
      ? [`${param.name}=${placeholderFor(param)}`]
      : [],
  );
  const query = queryParams.length === 0 ? "" : `?${queryParams.join("&")}`;
  return `${baseUrl.replace(/\/$/, "")}${path}${query}`;
}

/** Returns a placeholder value for a parameter based on its schema. */
function placeholderFor(param: OpenAPIV3_1.ParameterObject): string {
  const schemaType =
    param.schema && !("$ref" in param.schema) ? param.schema.type : undefined;
  if (schemaType === "number" || schemaType === "integer") {
    return "0";
  }
  if (schemaType === "boolean") {
    return "true";
  }
  return `<${param.name}>`;
}

/** Produces a sample JSON body for the request based on the resolved schema. */
function sampleRequestBody(
  requestBody: OpenAPIV3_1.RequestBodyObject | undefined,
  resolveSchema: ResolveSchema,
): string | undefined {
  if (!requestBody) {
    return undefined;
  }
  const json = requestBody.content?.["application/json"];
  if (!json?.schema) {
    return undefined;
  }
  const sample = sampleFromSchema(resolveSchema(json.schema), resolveSchema, 0);
  return JSON.stringify(sample, null, 2);
}

/** Walks a schema and builds a JSON-shaped sample value. */
function sampleFromSchema(
  schema: OpenAPIV3_1.SchemaObject,
  resolve: ResolveSchema,
  depth: number,
): unknown {
  if (depth > 4) {
    return null;
  }
  if (schema.example !== undefined) {
    return schema.example;
  }
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }
  if (schema.type === "array" && schema.items) {
    return [sampleFromSchema(resolve(schema.items), resolve, depth + 1)];
  }
  if (schema.type === "object" || schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [name, prop] of Object.entries(schema.properties ?? {})) {
      obj[name] = sampleFromSchema(resolve(prop), resolve, depth + 1);
    }
    return obj;
  }
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants && variants.length > 0) {
    return sampleFromSchema(resolve(variants[0]), resolve, depth + 1);
  }
  if (schema.type === "string") {
    return "string";
  }
  if (schema.type === "number" || schema.type === "integer") {
    return 0;
  }
  if (schema.type === "boolean") {
    return false;
  }
  if (schema.type === "null") {
    return null;
  }
  return null;
}

/** Generates a cURL request sample. */
function generateCurl(
  method: HttpMethod,
  url: string,
  hasAuth: boolean,
  body: string | undefined,
): string {
  const parts: string[] = [`curl -X ${method.toUpperCase()} '${url}'`];
  if (hasAuth) {
    parts.push("  -H 'Authorization: Bearer <TOKEN>'");
  }
  if (body) {
    parts.push("  -H 'Content-Type: application/json'");
    parts.push("  -d @- <<'JSON'");
    const command = `${parts.join(" \\\n")}\n${body}\nJSON`;
    return command;
  }
  return parts.join(" \\\n");
}

/** Generates a JavaScript `fetch` sample. */
function generateJsFetch(
  method: HttpMethod,
  url: string,
  hasAuth: boolean,
  body: string | undefined,
): string {
  const lines: string[] = [];
  lines.push(`const response = await fetch('${url}', {`);
  lines.push(`  method: '${method.toUpperCase()}',`);
  const headerLines: string[] = [];
  if (hasAuth) {
    headerLines.push("    Authorization: 'Bearer <TOKEN>',");
  }
  if (body) {
    headerLines.push("    'Content-Type': 'application/json',");
  }
  if (headerLines.length > 0) {
    lines.push("  headers: {");
    for (const header of headerLines) {
      lines.push(header);
    }
    lines.push("  },");
  }
  if (body) {
    lines.push(`  body: JSON.stringify(${body}),`);
  }
  lines.push("});");
  lines.push("const data = await response.json();");
  return lines.join("\n");
}

/** Generates a Python `requests` sample. */
function generatePython(
  method: HttpMethod,
  url: string,
  hasAuth: boolean,
  body: string | undefined,
): string {
  const lines: string[] = [];
  if (body) {
    lines.push("import json");
  }
  lines.push("import requests");
  lines.push("");
  if (hasAuth || body) {
    lines.push("headers = {");
    if (hasAuth) {
      lines.push('    "Authorization": "Bearer <TOKEN>",');
    }
    if (body) {
      lines.push('    "Content-Type": "application/json",');
    }
    lines.push("}");
  }
  if (body) {
    lines.push(`payload = json.loads("""${body}""")`);
  }
  const args: string[] = [`"${url}"`];
  if (hasAuth || body) {
    args.push("headers=headers");
  }
  if (body) {
    args.push("json=payload");
  }
  lines.push(`response = requests.${method}(${args.join(", ")})`);
  lines.push("data = response.json()");
  return lines.join("\n");
}

/** Generates a Go `net/http` sample. */
function generateGo(
  method: HttpMethod,
  url: string,
  hasAuth: boolean,
  body: string | undefined,
): string {
  const lines: string[] = [];
  lines.push("package main");
  lines.push("");
  lines.push("import (");
  lines.push('\t"fmt"');
  lines.push('\t"io"');
  lines.push('\t"net/http"');
  if (body) {
    lines.push('\t"strings"');
  }
  lines.push(")");
  lines.push("");
  lines.push("func main() {");
  if (body) {
    const escaped = body.replace(/`/g, '` + "`" + `');
    lines.push(`\tbody := strings.NewReader(\`${escaped}\`)`);
    lines.push(
      `\treq, _ := http.NewRequest("${method.toUpperCase()}", "${url}", body)`,
    );
  } else {
    lines.push(
      `\treq, _ := http.NewRequest("${method.toUpperCase()}", "${url}", nil)`,
    );
  }
  if (hasAuth) {
    lines.push('\treq.Header.Set("Authorization", "Bearer <TOKEN>")');
  }
  if (body) {
    lines.push('\treq.Header.Set("Content-Type", "application/json")');
  }
  lines.push("\tres, _ := http.DefaultClient.Do(req)");
  lines.push("\tdefer res.Body.Close()");
  lines.push("\tdata, _ := io.ReadAll(res.Body)");
  lines.push("\tfmt.Println(string(data))");
  lines.push("}");
  return lines.join("\n");
}
