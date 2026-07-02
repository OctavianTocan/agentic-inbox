import { Schema } from 'effect';

/** The fixed email dataset could not be loaded or decoded. */
export class SliceDatasetError extends Schema.TaggedErrorClass<SliceDatasetError>()(
  'SliceDatasetError',
  {
    detail: Schema.String
  }
) {}

/** The OpenRouter triage call failed before returning a usable decision. */
export class SliceModelError extends Schema.TaggedErrorClass<SliceModelError>()(
  'SliceModelError',
  {
    detail: Schema.String,
    status: Schema.optional(Schema.Number)
  }
) {}
