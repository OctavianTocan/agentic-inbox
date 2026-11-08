import { Schema } from 'effect';
import { EmailId } from './Domain';

/** No email exists for the requested id. */
export class EmailNotFound extends Schema.TaggedErrorClass<EmailNotFound>()(
  'EmailNotFound',
  {
    emailId: EmailId
  },
  { httpApiStatus: 404 }
) {}

/** The inbox could not be assembled from the datastore. */
export class InboxUnavailable extends Schema.TaggedErrorClass<InboxUnavailable>()(
  'InboxUnavailable',
  {
    detail: Schema.optional(Schema.String)
  },
  { httpApiStatus: 500 }
) {}
