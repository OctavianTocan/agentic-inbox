/** Discrete events streamed by a {@link ChatTransport} during one assistant turn. */
export type ChatTransportEvent =
  | { readonly type: 'text-delta'; readonly delta: string }
  | {
      readonly type: 'tool-call-start';
      readonly toolCallId: string;
      readonly toolName: string;
    }
  | {
      readonly type: 'tool-call-args';
      readonly toolCallId: string;
      readonly args: unknown;
    }
  | {
      readonly type: 'tool-result';
      readonly toolCallId: string;
      readonly output: unknown;
    }
  | { readonly type: 'done'; readonly conversationId?: string };

/** One turn's request: the user text plus the prior conversation for context. */
export interface ChatTransportRequest {
  readonly text: string;
  readonly history: ReadonlyArray<{
    readonly role: 'user' | 'assistant';
    readonly text: string;
  }>;
  readonly signal?: AbortSignal;
}

/**
 * Backend seam for a chat turn. Implementations stream an assistant turn as
 * discrete NDJSON events; the fetch-based transport swaps in behind this.
 */
export interface ChatTransport {
  /**
   * Stream one assistant turn for the given request.
   *
   * @param request - The user text, prior turns for context, and an abort signal.
   * @returns An async iterable of transport events, terminated by a `done` event.
   */
  send(request: ChatTransportRequest): AsyncIterable<ChatTransportEvent>;
}
