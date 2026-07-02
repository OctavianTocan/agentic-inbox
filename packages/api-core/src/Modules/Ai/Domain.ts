import { Schema } from 'effect';
import { isMaxLength, isMinLength, isTrimmed } from 'effect/Schema';

/** Prompt accepted by the starter AI draft endpoint. */
export const DraftPrompt: Schema.String = Schema.String.pipe(
  Schema.check(isMinLength(1)),
  Schema.check(isMaxLength(8_000)),
  Schema.check(isTrimmed())
).annotate({
  identifier: 'DraftPrompt',
  description: 'A trimmed prompt between 1 and 8000 characters.'
});

/** Request body for generating a draft response. */
export class DraftRequest extends Schema.Class<DraftRequest>('DraftRequest')({
  prompt: DraftPrompt
}) {}

/** Response body for the starter AI draft endpoint. */
export class DraftResponse extends Schema.Class<DraftResponse>('DraftResponse')(
  {
    text: Schema.String
  }
) {}
