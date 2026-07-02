import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from 'effect/unstable/httpapi';
import { DraftRequest, DraftResponse } from './Domain';
import { AiDraftError } from './Errors';

/** AI endpoints backed by either frontend server actions or the Effect backend. */
export class AiApi extends HttpApiGroup.make('ai')
  .add(
    HttpApiEndpoint.post('draft', '/draft', {
      payload: DraftRequest,
      success: DraftResponse,
      error: AiDraftError
    })
      .annotate(OpenApi.Summary, 'Generate a draft')
      .annotate(
        OpenApi.Description,
        'Generate a short draft response through the configured AI service.'
      )
  )
  .prefix('/ai') {}
