import * as Command from 'effect/unstable/cli/Command';
import { rootCommand } from './Command';

/** Runnable Effect CLI program for the `{{REPO_NAME}}` binary. */
export const runCli = Command.run(rootCommand, {
  version: '0.0.0',
});
