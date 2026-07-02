import * as Command from 'effect/unstable/cli/Command';
import { doctorCommand, greetCommand } from './Modules/Greet/Command';

/** Root command for the {{REPO_NAME}} CLI. */
export const rootCommand = Command.make('{{REPO_NAME}}').pipe(
  Command.withDescription(
    'Greet recipients through the shared Greeter service.'
  ),
  Command.withSubcommands([doctorCommand, greetCommand])
);
