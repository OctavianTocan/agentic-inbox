import { BunRuntime } from '@effect/platform-bun';
import { Console, Effect } from 'effect';
import { runMigrations } from './Migrator';

const program = Effect.gen(function* () {
  const migrations = yield* runMigrations;
  yield* Console.log(`Applied ${migrations.length} migration(s).`);
});

program.pipe(BunRuntime.runMain);
