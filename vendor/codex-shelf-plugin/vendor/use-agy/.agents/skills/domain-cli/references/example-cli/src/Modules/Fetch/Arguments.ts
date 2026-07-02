/**
 * Fetch command arguments and options.
 */
import { Args, Options } from '@effect/cli';

/** URL to fetch — positional argument. */
export const url = Args.text({ name: 'url' }).pipe(
  Args.withDescription('URL to fetch')
);

/** When true, print only response headers without the body. */
export const headersOnly = Options.boolean('headers').pipe(
  Options.withAlias('H'),
  Options.withDescription('Show response headers only (no body)'),
  Options.withDefault(false)
);
