/**
 * Greet command arguments and options.
 *
 * Demonstrates:
 * - Args.text for positional arguments
 * - Options.text / .boolean / .integer with aliases and defaults
 * - Options.optional wrapping a value in Option<T>
 */
import { Args, Options } from '@effect/cli';

/** Custom greeting word (e.g. "Hi", "Hey"). Falls back to "Hello". */
export const greeting = Options.text('greeting').pipe(
  Options.withAlias('g'),
  Options.withDescription('Custom greeting word'),
  Options.optional
);

/** Number of times to repeat the greeting. */
export const times = Options.integer('times').pipe(
  Options.withAlias('n'),
  Options.withDescription('Number of times to repeat the greeting'),
  Options.withDefault(1)
);

/** Enable verbose output with extra context. */
export const verbose = Options.boolean('verbose').pipe(
  Options.withAlias('v'),
  Options.withDescription('Enable verbose output'),
  Options.withDefault(false)
);

/** The name to greet — positional argument. */
export const name = Args.text({ name: 'name' }).pipe(
  Args.withDescription('The name to greet')
);
