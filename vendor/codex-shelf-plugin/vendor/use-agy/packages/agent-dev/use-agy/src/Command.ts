import * as Command from 'effect/unstable/cli/Command';
import { doctorCommand } from './Modules/Doctor/Command';
import { runCommand } from './Modules/Run/Command';

/** Root command for the use-agy CLI. */
export const rootCommand = Command.make('use-agy').pipe(
  Command.withDescription(
    'Use AGY through the shared use-agy service surface.'
  ),
  Command.withSubcommands([doctorCommand, runCommand])
);
