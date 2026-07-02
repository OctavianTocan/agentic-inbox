import { Schema } from 'effect';

/** The backend could not produce an AI draft. */
export class AiDraftError extends Schema.TaggedErrorClass<AiDraftError>()(
  'AiDraftError',
  {
    detail: Schema.optional(Schema.String)
  },
  { httpApiStatus: 502 }
) {}
