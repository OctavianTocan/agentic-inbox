import { Schema } from 'effect';

/** The triage run could not be started. */
export class TriageRunFailed extends Schema.TaggedErrorClass<TriageRunFailed>()(
  'TriageRunFailed',
  {
    detail: Schema.optional(Schema.String)
  },
  { httpApiStatus: 500 }
) {}
