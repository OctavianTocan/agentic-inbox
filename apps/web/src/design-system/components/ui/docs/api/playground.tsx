"use client";

import type { OpenAPIV3_1 } from "openapi-types";
import { type FormEvent, type ReactNode, useId, useReducer } from "react";
import { cn } from "../../../../lib/utils";
import { Button } from "../../button";
import { Input } from "../../input";
import { Label } from "../../label";
import { Textarea } from "../../textarea";
import type { HttpMethod } from "./api-info";

const TOKEN_STORAGE_KEY = "docs-api-bearer";

type PlaygroundProps = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly baseUrl: string;
  readonly hasAuth: boolean;
  readonly parameters: readonly OpenAPIV3_1.ParameterObject[];
  readonly hasRequestBody: boolean;
  readonly className?: string;
};

type ResponseState = {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
};

type PlaygroundState = {
  readonly token: string;
  readonly pathValues: Record<string, string>;
  readonly queryValues: Record<string, string>;
  readonly body: string;
  readonly bodyError: string | null;
  readonly response: ResponseState | null;
  readonly error: string | null;
  readonly isPending: boolean;
};

type PlaygroundAction =
  | { type: "SET_TOKEN"; value: string }
  | { type: "SET_PATH_VALUE"; name: string; value: string }
  | { type: "SET_QUERY_VALUE"; name: string; value: string }
  | { type: "SET_BODY"; value: string }
  | { type: "BODY_ERROR"; message: string }
  | { type: "REQUEST_START" }
  | { type: "REQUEST_SUCCESS"; response: ResponseState }
  | { type: "REQUEST_ERROR"; message: string }
  | { type: "REQUEST_DONE" };

/** Reduces all playground form and request state into a single object. */
function playgroundReducer(
  state: PlaygroundState,
  action: PlaygroundAction,
): PlaygroundState {
  switch (action.type) {
    case "SET_TOKEN":
      return { ...state, token: action.value };
    case "SET_PATH_VALUE":
      return {
        ...state,
        pathValues: { ...state.pathValues, [action.name]: action.value },
      };
    case "SET_QUERY_VALUE":
      return {
        ...state,
        queryValues: { ...state.queryValues, [action.name]: action.value },
      };
    case "SET_BODY":
      return {
        ...state,
        body: action.value,
        bodyError: state.bodyError ? null : state.bodyError,
      };
    case "BODY_ERROR":
      return { ...state, bodyError: action.message };
    case "REQUEST_START":
      return {
        ...state,
        bodyError: null,
        isPending: true,
        error: null,
        response: null,
      };
    case "REQUEST_SUCCESS":
      return { ...state, response: action.response };
    case "REQUEST_ERROR":
      return { ...state, error: action.message };
    case "REQUEST_DONE":
      return { ...state, isPending: false };
  }
}

/** Returns the initial playground state, reading the token from local storage. */
function createInitialState(): PlaygroundState {
  return {
    token:
      typeof window !== "undefined"
        ? (window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "")
        : "",
    pathValues: {},
    queryValues: {},
    body: "{}",
    bodyError: null,
    response: null,
    error: null,
    isPending: false,
  };
}

/**
 * Interactive request runner that sends a real request to the API and shows
 * the response. When auth is required, the caller supplies a bearer token.
 *
 * @param props - Operation details.
 * @param props.method - HTTP method.
 * @param props.path - Endpoint path template.
 * @param props.baseUrl - API base URL prepended to the path.
 * @param props.hasAuth - When true, the playground exposes a bearer token field.
 * @param props.parameters - Parameter list used to render path/query inputs.
 * @param props.hasRequestBody - Whether the operation accepts a JSON body.
 * @param props.className - Extra classes merged with the base layout.
 * @returns The interactive playground form and response panel.
 */
export function Playground({
  method,
  path,
  baseUrl,
  hasAuth,
  parameters,
  hasRequestBody,
  className,
}: PlaygroundProps) {
  const [state, dispatch] = useReducer(
    playgroundReducer,
    undefined,
    createInitialState,
  );
  const {
    token,
    pathValues,
    queryValues,
    body,
    bodyError,
    response,
    error,
    isPending,
  } = state;
  const fieldPrefix = useId();
  const tokenFieldId = `${fieldPrefix}-token`;
  const bodyFieldId = `${fieldPrefix}-body`;
  const bodyErrorId = `${fieldPrefix}-body-error`;

  const pathParams = parameters.filter((param) => param.in === "path");
  const queryParams = parameters.filter((param) => param.in === "query");

  /** Submits the configured request and updates the response panel. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasRequestBody && body.trim().length > 0) {
      try {
        JSON.parse(body);
      } catch {
        dispatch({ type: "BODY_ERROR", message: "Body is not valid JSON" });
        return;
      }
    }
    dispatch({ type: "REQUEST_START" });

    try {
      const url = buildUrl(baseUrl, path, pathValues, queryValues);
      const headers: Record<string, string> = {};
      if (hasAuth && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (hasRequestBody) {
        headers["Content-Type"] = "application/json";
      }
      const init: RequestInit = {
        method: method.toUpperCase(),
        headers,
        credentials: "include",
      };
      if (hasRequestBody && body.trim().length > 0) {
        init.body = body;
      }
      const result = await fetch(url, init);
      const text = await result.text();
      dispatch({
        type: "REQUEST_SUCCESS",
        response: {
          status: result.status,
          statusText: result.statusText,
          body: prettyPrintMaybeJson(text),
        },
      });
    } catch (caught) {
      dispatch({
        type: "REQUEST_ERROR",
        message: caught instanceof Error ? caught.message : "Request failed",
      });
    } finally {
      dispatch({ type: "REQUEST_DONE" });
    }
  }

  /** Stores the bearer token to local storage and updates state. */
  function handleTokenChange(value: string) {
    dispatch({ type: "SET_TOKEN", value });
    writeToken(value);
  }

  return (
    <section
      className={cn(
        "not-prose space-y-4 rounded-lg border bg-card p-4",
        className,
      )}
      data-slot="api-playground"
    >
      <header>
        <h2 className="font-semibold text-base">Try it</h2>
        <p className="text-muted-foreground text-xs">
          Sends a real request to {baseUrl}.
        </p>
      </header>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {hasAuth && (
          <PlaygroundField fieldId={tokenFieldId} label="Bearer token">
            <Input
              autoComplete="off"
              id={tokenFieldId}
              onChange={(event) => handleTokenChange(event.currentTarget.value)}
              placeholder="paste your token..."
              type="password"
              value={token}
            />
          </PlaygroundField>
        )}
        {pathParams.map((param) => {
          const fieldId = `${fieldPrefix}-path-${param.name}`;
          return (
            <PlaygroundField
              fieldId={fieldId}
              key={fieldId}
              label={`${param.name} (path)`}
              required={param.required}
            >
              <Input
                id={fieldId}
                onChange={(event) =>
                  dispatch({
                    type: "SET_PATH_VALUE",
                    name: param.name,
                    value: event.currentTarget.value,
                  })
                }
                placeholder={`<${param.name}>`}
                value={pathValues[param.name] ?? ""}
              />
            </PlaygroundField>
          );
        })}
        {queryParams.map((param) => {
          const fieldId = `${fieldPrefix}-query-${param.name}`;
          return (
            <PlaygroundField
              fieldId={fieldId}
              key={fieldId}
              label={`${param.name} (query)`}
              required={param.required}
            >
              <Input
                id={fieldId}
                onChange={(event) =>
                  dispatch({
                    type: "SET_QUERY_VALUE",
                    name: param.name,
                    value: event.currentTarget.value,
                  })
                }
                placeholder={param.description ?? `<${param.name}>`}
                value={queryValues[param.name] ?? ""}
              />
            </PlaygroundField>
          );
        })}
        {hasRequestBody && (
          <PlaygroundField fieldId={bodyFieldId} label="Request body (JSON)">
            <Textarea
              aria-describedby={bodyError ? bodyErrorId : undefined}
              aria-invalid={bodyError ? true : undefined}
              className="min-h-32 font-mono text-xs"
              id={bodyFieldId}
              onChange={(event) =>
                dispatch({ type: "SET_BODY", value: event.currentTarget.value })
              }
              placeholder='{ "key": "value" }'
              value={body}
            />
            {bodyError && (
              <p
                className="text-destructive text-xs"
                id={bodyErrorId}
                role="alert"
              >
                {bodyError}
              </p>
            )}
          </PlaygroundField>
        )}
        <Button disabled={isPending} type="submit">
          {isPending ? "Sending..." : "Send"}
        </Button>
      </form>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {response && (
        <div className="space-y-2">
          <p className="font-mono text-xs">
            {response.status} {response.statusText}
          </p>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
            {response.body}
          </pre>
        </div>
      )}
    </section>
  );
}

type PlaygroundFieldProps = {
  readonly fieldId: string;
  readonly label: string;
  readonly required?: boolean;
  readonly children: ReactNode;
};

/** Field wrapper that pairs a label with an input control. */
function PlaygroundField({
  fieldId,
  label,
  required,
  children,
}: PlaygroundFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="font-medium text-xs" htmlFor={fieldId}>
        {label}
        {required && (
          <span aria-label="required" className="ml-1 text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

/** Persists the bearer token to local storage (or clears it when empty). */
function writeToken(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value.length === 0) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
}

/** Substitutes path placeholders and appends query params to build the request URL. */
function buildUrl(
  baseUrl: string,
  path: string,
  pathValues: Readonly<Record<string, string>>,
  queryValues: Readonly<Record<string, string>>,
): string {
  let resolved = path;
  for (const [name, value] of Object.entries(pathValues)) {
    if (value.length === 0) {
      continue;
    }
    resolved = resolved.replaceAll(`{${name}}`, encodeURIComponent(value));
  }
  const query = Object.entries(queryValues)
    .flatMap(([name, value]) =>
      value.length > 0
        ? [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]
        : [],
    )
    .join("&");
  const suffix = query.length === 0 ? "" : `?${query}`;
  return `${baseUrl.replace(/\/$/, "")}${resolved}${suffix}`;
}

/** Pretty-prints a response body when it parses as JSON; otherwise returns it as-is. */
function prettyPrintMaybeJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
