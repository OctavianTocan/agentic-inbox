const DEFAULT_API_ORIGIN = 'http://127.0.0.1:8001';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

type ApiProxyContext = {
  readonly params: Promise<{
    readonly path: readonly string[];
  }>;
};

/** Removes a trailing slash so path segments compose predictably. */
function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Builds the backend origin for local and tailnet dev previews. */
function apiOrigin(): string {
  return trimTrailingSlash(
    process.env.AGENTIC_INBOX_API_ORIGIN ?? DEFAULT_API_ORIGIN
  );
}

/**
 * Builds the upstream API URL while preserving the browser request query.
 *
 * @param request - Incoming same-origin request handled by Next.js.
 * @param path - Catch-all API path segments under `/api/v1`.
 * @returns Absolute Effect API URL for the upstream request.
 */
function upstreamUrl(request: Request, path: readonly string[]): string {
  const source = new URL(request.url);
  const encodedPath = path.map(encodeURIComponent).join('/');
  return `${apiOrigin()}/api/v1/${encodedPath}${source.search}`;
}

/**
 * Copies request headers that are meaningful to the backend API.
 *
 * @param source - Browser request headers.
 * @returns Headers safe to forward through the BFF proxy.
 */
function forwardedRequestHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const [key, value] of source) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  return headers;
}

/**
 * Copies upstream response headers and disables buffering for streamed events.
 *
 * @param source - Effect API response headers.
 * @returns Headers for the browser-facing response.
 */
function forwardedResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const [key, value] of source) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('X-Accel-Buffering', 'no');
  return headers;
}

/**
 * Reads the request payload for methods that can carry one.
 *
 * @param request - Incoming browser request.
 * @returns Buffered request body or undefined for bodyless methods.
 */
async function requestBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }
  return request.arrayBuffer();
}

/**
 * Proxies a same-origin browser API request to the Effect backend.
 *
 * @param request - Incoming Next.js route-handler request.
 * @param context - Catch-all route context containing the API path.
 * @returns The upstream response, preserving streamed bodies.
 */
async function proxyApi(
  request: Request,
  context: ApiProxyContext
): Promise<Response> {
  const { path } = await context.params;
  const body = await requestBody(request);
  const response =
    body === undefined
      ? await fetch(upstreamUrl(request, path), {
          headers: forwardedRequestHeaders(request.headers),
          method: request.method,
          signal: request.signal
        })
      : await fetch(upstreamUrl(request, path), {
          body,
          headers: forwardedRequestHeaders(request.headers),
          method: request.method,
          signal: request.signal
        });

  return new Response(response.body, {
    headers: forwardedResponseHeaders(response.headers),
    status: response.status,
    statusText: response.statusText
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = proxyApi;
export const POST = proxyApi;
export const PUT = proxyApi;
export const PATCH = proxyApi;
export const DELETE = proxyApi;
export const HEAD = proxyApi;
export const OPTIONS = proxyApi;
