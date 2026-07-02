import * as Argument from 'effect/unstable/cli/Argument';

/** Recipient-name argument accepted by the greet command. */
export const name = Argument.string('name').pipe(
  Argument.withDescription('Name of the recipient to greet.')
);
