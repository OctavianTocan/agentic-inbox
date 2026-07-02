/**
 * Greet command — prints a greeting message.
 *
 * Demonstrates:
 * - Importing args/options from Arguments.ts
 * - Option.getOrElse to unwrap optional values with a fallback
 * - No service dependencies — pure output command
 *
 * Usage:
 *   example-cli greet <name>
 *   example-cli greet -g Hi -n 3 Alice
 *   example-cli greet -v Alice
 */
import { Command } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import * as GreetArgs from './Arguments';

/** Greet someone by name with optional customization. */
export const GreetCommand = Command.make(
  'greet',
  {
    name: GreetArgs.name,
    greeting: GreetArgs.greeting,
    times: GreetArgs.times,
    verbose: GreetArgs.verbose,
  },
  ({ name, greeting, times, verbose }) =>
    Effect.gen(function* () {
      const word = Option.getOrElse(greeting, () => 'Hello');

      if (verbose) {
        yield* Console.log(`Greeting "${name}" with "${word}" (${times}x)`);
      }

      for (let i = 0; i < times; i++) {
        yield* Console.log(`${word}, ${name}!`);
      }
    })
).pipe(Command.withDescription('Greet someone by name'));
