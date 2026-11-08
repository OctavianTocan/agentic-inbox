import { Schema } from 'effect';

/** The chat agent turn failed. */
export class ChatFailed extends Schema.TaggedErrorClass<ChatFailed>()(
  'ChatFailed',
  {
    detail: Schema.optional(Schema.String)
  },
  { httpApiStatus: 500 }
) {}
