import { Schema } from 'effect';

export class AiSdkError extends Schema.TaggedErrorClass<AiSdkError>()(
  'AiSdkError',
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Defect())
  }
) {}
