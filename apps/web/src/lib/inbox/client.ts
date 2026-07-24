import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { HttpApiClient } from 'effect/unstable/httpapi';
import type { ApprovalVerdict, Inbox, TriageRunEvent } from './types';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and docs/agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## Web HttpApiClient
//
// - Prefer `HttpApiClient.make(Api, { baseUrl })` + `FetchHttpClient.layer` for JSON routes.
// - Import wire types from `@app/api-core` (see `lib/inbox/types.ts`); do not redefine mirrors.
// - SSE (triage/chat) may keep a thin raw-fetch adapter for AbortSignal + UI event narrowing.
// - See `docs/agent-patterns/effect-httpapi.md`.
//</skill-gen>

/** Inputs for resolving a pending approval on a sensitive email. */
export type ResolveApprovalInput = {
  readonly verdict: ApprovalVerdict;
  /** Edited reply body to send instead of the agent draft when approving. */
  readonly editedBody?: string;
};

/** Run options: `fresh` clears prior triage; `signal` cancels the SSE stream (pause). */
export type RunTriageOptions = {
  readonly fresh?: boolean;
  readonly signal?: AbortSignal;
};

/** Thin data seam between the inbox UI and the backend API. */
export type InboxClient = {
  /** Fetch the current inbox snapshot: summary plus joined items. */
  getInbox: () => Promise<Inbox>;
  /** Run the batch triage agent and stream progress events. Pass fresh to clear prior triage state first. */
  runTriage: (options?: RunTriageOptions) => AsyncIterable<TriageRunEvent>;
  /** Approve or deny a pending sensitive action and return the updated inbox. */
  resolveApproval: (
    approvalId: string,
    input: ResolveApprovalInput
  ) => Promise<Inbox>;
  /** Undo a previously executed action and return the updated inbox. */
  undoAction: (ledgerEntryId: string, emailId: string) => Promise<Inbox>;
  /** Re-run the agent on one email and return the updated inbox. */
  retriage: (emailId: string) => Promise<Inbox>;
};

/** Same-origin base URL for browser; empty for SSR callers that only build the client. */
const apiBaseUrl = (): string =>
  typeof window === 'undefined' ? '' : window.location.origin;

/** Builds the typed client Effect for the shared HttpApi contract. */
const makeApiClientEffect = () =>
  HttpApiClient.make(Api, { baseUrl: apiBaseUrl() });

type ApiClient = Effect.Success<ReturnType<typeof makeApiClientEffect>>;

/**
 * Runs a typed HttpApiClient program with FetchHttpClient.
 *
 * @param body - Client callback returning the Effect to execute.
 */
const withClient = <A, E>(
  body: (client: ApiClient) => Effect.Effect<A, E>
): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* makeApiClientEffect();
      return yield* body(client);
    }).pipe(Effect.provide(FetchHttpClient.layer))
  );

/** Object-like value that can be safely indexed by string keys. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a string property from an unknown payload. */
function stringField(
  record: Readonly<Record<string, unknown>>,
  key: string
): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Reads a number property from an unknown payload. */
function numberField(
  record: Readonly<Record<string, unknown>>,
  key: string
): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

/** Reads an HTTP response body when possible, falling back to status text. */
async function responseMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  return body || response.statusText || `HTTP ${response.status}`;
}

/** Throws a readable error when an API response failed. */
async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }
  throw new Error(await responseMessage(response));
}

/** Typed inbox snapshot from the HttpApiClient. */
async function fetchInbox(): Promise<Inbox> {
  return withClient((client) => client.triage.inbox());
}

/** Extracts the email id from a nested backend event object. */
function emailIdFromNested(
  payload: Readonly<Record<string, unknown>>,
  key: string
): string | null {
  const nested = payload[key];
  if (!isRecord(nested)) {
    return null;
  }
  return stringField(nested, 'emailId');
}

/** Extracts a summary from a nested backend event object. */
function summaryFromNested(
  payload: Readonly<Record<string, unknown>>,
  key: string
): string | null {
  const nested = payload[key];
  if (!isRecord(nested)) {
    return null;
  }
  return stringField(nested, 'summary');
}

/** Converts one backend triage payload to the lightweight UI event shape. */
function triageEventFromPayload(
  payload: Readonly<Record<string, unknown>>
): TriageRunEvent | null {
  const type = stringField(payload, 'type');
  if (type === 'started') {
    const emailId = stringField(payload, 'emailId');
    return emailId === null ? null : { type, emailId };
  }
  if (type === 'decision') {
    const emailId = emailIdFromNested(payload, 'classification');
    return emailId === null ? null : { type, emailId };
  }
  if (type === 'action') {
    const emailId = emailIdFromNested(payload, 'entry');
    const summary = summaryFromNested(payload, 'entry') ?? 'Agent action';
    return emailId === null ? null : { type, emailId, summary };
  }
  if (type === 'approval_pending') {
    const emailId = emailIdFromNested(payload, 'approval');
    const summary = summaryFromNested(payload, 'approval') ?? 'Needs approval';
    return emailId === null ? null : { type, emailId, summary };
  }
  if (type === 'failed') {
    const emailId = stringField(payload, 'emailId');
    const reason = stringField(payload, 'reason') ?? 'Triage failed';
    return emailId === null ? null : { type, emailId, reason };
  }
  if (type === 'done') {
    const processed = numberField(payload, 'processed');
    return processed === null ? null : { type, processed };
  }
  return null;
}

type SseBlock = {
  readonly event: string | null;
  readonly data: string;
};

/** Reads the SSE event name and data payload from a raw message block. */
function parseSseBlock(block: string): SseBlock {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }
  return { event, data: dataLines.join('\n') };
}

/** Builds a readable error message from an SSE error payload. */
function triageStreamErrorMessage(payload: unknown): string {
  if (!isRecord(payload)) {
    return 'Triage run failed';
  }
  return (
    stringField(payload, 'detail') ??
    stringField(payload, 'message') ??
    stringField(payload, 'reason') ??
    stringField(payload, 'error') ??
    stringField(payload, '_tag') ??
    'Triage run failed'
  );
}

/** Parses one SSE block from the triage run endpoint. */
function triageEventFromSseBlock(block: string): TriageRunEvent | null {
  const { event: sseEvent, data } = parseSseBlock(block);
  if (data.length === 0 || data === '[DONE]') {
    return null;
  }
  const parsed: unknown = JSON.parse(data);
  if (sseEvent === 'error') {
    throw new Error(triageStreamErrorMessage(parsed));
  }
  if (isRecord(parsed) && stringField(parsed, 'type') === 'error') {
    throw new Error(triageStreamErrorMessage(parsed));
  }
  return isRecord(parsed) ? triageEventFromPayload(parsed) : null;
}

/** Streams the triage SSE response as typed UI events. */
async function* triageEventsFromResponse(
  response: Response,
  signal?: AbortSignal
): AsyncIterable<TriageRunEvent> {
  if (response.body === null) {
    throw new Error('Triage run response had no body');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  try {
    while (true) {
      if (signal?.aborted) {
        return;
      }
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const event = triageEventFromSseBlock(block);
        if (event !== null) {
          if (event.type === 'done') {
            sawDone = true;
            yield event;
            return;
          }
          yield event;
        }
      }
    }
    buffer += decoder.decode();
    if (buffer.trim().length === 0) {
      if (signal?.aborted) {
        return;
      }
    } else {
      const event = triageEventFromSseBlock(buffer);
      if (event !== null) {
        if (event.type === 'done') {
          sawDone = true;
          yield event;
          return;
        }
        yield event;
      }
    }
    if (signal?.aborted) {
      return;
    }
    if (!sawDone) {
      throw new Error('Triage run ended before completion');
    }
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      return;
    }
    throw error;
  } finally {
    try {
      if (sawDone) {
        await reader.cancel();
      } else if (signal?.aborted) {
        await reader.cancel('paused');
      }
    } catch {
      // Reader may already be closed after an abort.
    }
    try {
      reader.releaseLock();
    } catch {
      // Already released.
    }
  }
}

/** True when a fetch/stream rejection was caused by AbortController. */
function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * Opens the backend triage stream.
 *
 * SSE stays on raw `fetch` so AbortSignal pause/cancel and UI event narrowing
 * stay simple; JSON routes use {@link HttpApiClient}.
 */
async function* runTriage(
  options: RunTriageOptions = {}
): AsyncIterable<TriageRunEvent> {
  const { fresh = false, signal } = options;
  const response = await fetch('/api/v1/triage/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fresh }),
    ...(signal === undefined ? {} : { signal })
  });
  await assertOk(response);
  yield* triageEventsFromResponse(response, signal);
}

/** HTTP client backed by Effect `HttpApiClient` for JSON + raw fetch for SSE. */
function createHttpInboxClient(): InboxClient {
  return {
    getInbox: fetchInbox,
    runTriage,
    resolveApproval: async (approvalId, input) => {
      await withClient((client) =>
        client.actions.resolveApproval({
          params: { id: approvalId },
          payload: input
        })
      );
      return fetchInbox();
    },
    undoAction: async (ledgerEntryId) => {
      await withClient((client) =>
        client.actions.undo({ params: { id: ledgerEntryId } })
      );
      return fetchInbox();
    },
    retriage: async (emailId) => {
      return withClient((client) =>
        client.triage.retriage({ params: { id: emailId } })
      );
    }
  };
}

/** Shared API client instance for the inbox UI. */
export const inboxClient: InboxClient = createHttpInboxClient();
