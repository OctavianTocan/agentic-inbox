import { PgClient } from '@effect/sql-pg';
import { Effect, Redacted } from 'effect';
import initialMigration from '../../migrations/0001_initial';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://cogram:cogram@localhost:5442/cogram';

/** Postgres pool for tests, pointed at the docker-compose database. */
export const TestDatabaseLive = PgClient.layer({
  url: Redacted.make(TEST_DATABASE_URL)
});

/** Applies the schema, then truncates all app tables for isolation between tests. */
export const resetSchema = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  yield* initialMigration;
  yield* sql`TRUNCATE decisions, action_ledger, conversations RESTART IDENTITY CASCADE`.pipe(
    Effect.orDie
  );
});

/** Runs an Effect against a freshly-reset test database and returns its result. */
export const runDb = <A, E>(
  effect: Effect.Effect<A, E, PgClient.PgClient>
): Promise<A> =>
  resetSchema.pipe(
    Effect.andThen(effect),
    Effect.provide(TestDatabaseLive),
    Effect.scoped,
    Effect.runPromise
  );
