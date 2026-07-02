import { BunRuntime } from '@effect/platform-bun';
import { Effect } from 'effect';
import { Cli, MainLayer } from './Cli';

Cli(process.argv).pipe(
  Effect.catchAll((code) => Effect.sync(() => process.exit(Number(code)))),
  Effect.provide(MainLayer),
  BunRuntime.runMain
);
