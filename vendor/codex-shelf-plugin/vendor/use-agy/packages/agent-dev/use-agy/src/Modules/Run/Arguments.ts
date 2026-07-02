import * as Argument from 'effect/unstable/cli/Argument';
import * as Flag from 'effect/unstable/cli/Flag';

/** Prompt argument accepted by AGY run commands. */
export const prompt = Argument.string('prompt').pipe(
  Argument.withDescription('Prompt to pass to AGY.')
);

/** Optional working directory flag for the AGY run workspace. */
export const cwd = Flag.string('cwd').pipe(
  Flag.optional,
  Flag.withDescription('Workspace directory for the AGY run.')
);

/** Optional model override flag passed through to AGY. */
export const model = Flag.string('model').pipe(
  Flag.optional,
  Flag.withDescription('AGY model override for this run.')
);

/** Optional sandbox policy flag passed through to AGY. */
export const sandbox = Flag.string('sandbox').pipe(
  Flag.optional,
  Flag.withDescription('AGY sandbox override for this run.')
);

/** Optional print timeout flag passed through to AGY. */
export const timeout = Flag.string('timeout').pipe(
  Flag.optional,
  Flag.withDescription('AGY print timeout, passed to AGY as-is.')
);

/** Repeatable additional workspace directory flag passed through to AGY. */
export const addDirs = Flag.string('add-dir').pipe(
  Flag.withDescription('Additional workspace directory. Repeat to add more.'),
  Flag.atLeast(0)
);
