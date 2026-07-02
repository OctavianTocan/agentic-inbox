/**
 * Config subcommand group — manages key-value configuration.
 *
 * Demonstrates:
 * - Nested subcommands via Command.withSubcommands
 * - Effect.Service dependency injection via Command.provide
 * - Importing argument definitions from Arguments.ts
 * - Option.match for handling optional values
 *
 * Store.Default is provided once on the parent command and
 * flows to all child subcommands automatically.
 *
 * Usage:
 *   example-cli config get <key>
 *   example-cli config set <key> <value>
 *   example-cli config list
 */
import { Command } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { ConfigArgs } from './Arguments';
import { Store } from './Service';

/** Look up a single config value by key. */
const GetCommand = Command.make(
  'get',
  { args: ConfigArgs.get },
  ({ args: { key } }) =>
    Effect.gen(function* () {
      const store = yield* Store;
      const result = yield* store.get(key);

      yield* Option.match(result, {
        onNone: () => Console.error(`Key "${key}" not found`),
        onSome: (v) => Console.log(`${key} = ${v}`),
      });
    })
).pipe(Command.withDescription('Get a config value'));

/** Set a config key to a value, creating or overwriting. */
const SetCommand = Command.make(
  'set',
  { args: ConfigArgs.set },
  ({ args: { key, value } }) =>
    Effect.gen(function* () {
      const store = yield* Store;
      yield* store.set(key, value);
      yield* Console.log(`Set ${key} = ${value}`);
    })
).pipe(Command.withDescription('Set a config value'));

/** List all stored config entries. */
const ListCommand = Command.make('list', {}, () =>
  Effect.gen(function* () {
    const store = yield* Store;
    const entries = yield* store.list();

    if (entries.length === 0) {
      yield* Console.log('No configuration values set');
      return;
    }

    for (const [k, v] of entries) {
      yield* Console.log(`${k} = ${v}`);
    }
  })
).pipe(Command.withDescription('List all config values'));

/** Parent command grouping all config subcommands with Store injected. */
export const ConfigCommand = Command.make('config').pipe(
  Command.withSubcommands([GetCommand, SetCommand, ListCommand]),
  Command.provide(Store.Default),
  Command.withDescription('Manage configuration key-value pairs')
);
