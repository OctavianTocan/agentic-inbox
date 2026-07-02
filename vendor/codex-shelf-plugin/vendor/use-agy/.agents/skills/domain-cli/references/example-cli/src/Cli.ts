import { Command } from '@effect/cli';
import { FetchHttpClient } from '@effect/platform';
import { BunContext } from '@effect/platform-bun';
import { Layer } from 'effect';
import pkg from '../package.json' with { type: 'json' };
import { ConfigCommand } from './Modules/Config/Command';
import { FetchCommand } from './Modules/Fetch/Command';
import { GreetCommand } from './Modules/Greet/Command';

const RootCommand = Command.make('example-cli').pipe(
  Command.withSubcommands([GreetCommand, ConfigCommand, FetchCommand])
);

export const Cli = Command.run(RootCommand, {
  name: 'example-cli',
  version: pkg.version,
});

export const MainLayer = Layer.mergeAll(
  BunContext.layer,
  FetchHttpClient.layer
);
