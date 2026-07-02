import { Schema } from 'effect';

/** Stable identifier of an email in the fixed dataset (`e-001`..`e-080`). */
export const EmailId: Schema.String = Schema.String.pipe(
  Schema.check(Schema.isNonEmpty())
).annotate({
  identifier: 'EmailId',
  description: 'Dataset email identifier such as `e-001`.'
});

/** Where the agent has placed an email after processing. */
export const EmailStatus: Schema.Literals<
  readonly ['needs_attention', 'done_for_you', 'filed']
> = Schema.Literals(['needs_attention', 'done_for_you', 'filed']).annotate({
  identifier: 'EmailStatus',
  description:
    'Review bucket: `needs_attention` (human required), `done_for_you` (auto-handled), or `filed` (archived).'
});

/** A single email from the static AEC inbox dataset. */
export class Email extends Schema.Class<Email>('Email')({
  id: EmailId,
  from: Schema.String.annotate({
    description: 'Sender display name and address.'
  }),
  to: Schema.Array(Schema.String).annotate({
    description: 'Primary recipients.'
  }),
  cc: Schema.Array(Schema.String).annotate({
    description: 'Carbon-copy recipients.'
  }),
  subject: Schema.String.annotate({ description: 'Email subject line.' }),
  body: Schema.String.annotate({ description: 'Plain-text email body.' }),
  timestamp: Schema.String.annotate({
    description: 'ISO-8601 UTC timestamp the email was received.'
  }),
  inReplyTo: Schema.NullOr(EmailId).annotate({
    description:
      'Id of the email this one replies to, or null when it starts a thread.'
  })
}) {}

/**
 * Codec for rows of `data/emails.json`, whose wire form names the reply
 * pointer `in_reply_to`. Decode dataset rows with this, not `Email`.
 */
export const EmailFromDataset = Email.pipe(
  Schema.encodeKeys({ inReplyTo: 'in_reply_to' })
);
