/**
 * Config command arguments.
 *
 * Demonstrates:
 * - Args.all with an object to group related positional args
 * - The handler receives a typed object: { key: string, value: string }
 *   instead of flat destructured values
 * - Reuse of individual args across different command arg groups
 */
import { Args } from '@effect/cli';

/** Configuration key — positional argument. */
const key = Args.text({ name: 'key' }).pipe(
  Args.withDescription('Configuration key')
);

/** Configuration value — positional argument. */
const value = Args.text({ name: 'value' }).pipe(
  Args.withDescription('Configuration value')
);

/** Grouped argument sets for each config subcommand. */
export const ConfigArgs = {
  get: Args.all({ key }),
  set: Args.all({ key, value }),
};
