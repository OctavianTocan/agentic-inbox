import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi
} from 'effect/unstable/httpapi';
import { ChatRequest, ChatStreamEvent } from './Domain';
import { ChatFailed } from './Errors';

/** Interactive sidepanel chat endpoint. */
export class ChatApi extends HttpApiGroup.make('chat').add(
  HttpApiEndpoint.post('send', '/chat', {
    payload: ChatRequest,
    success: HttpApiSchema.StreamSse({
      data: ChatStreamEvent,
      error: ChatFailed
    }),
    error: ChatFailed
  })
    .annotate(OpenApi.Summary, 'Chat with the agent')
    .annotate(
      OpenApi.Description,
      'Send a message and stream text deltas, reasoning, and tool-call events as Server-Sent Events.'
    )
) {}
