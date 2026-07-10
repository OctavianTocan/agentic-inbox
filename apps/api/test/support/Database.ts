import { PgClient } from '@effect/sql-pg';
import { Effect, Redacted } from 'effect';
import initialMigration from '../../migrations/0001_initial';

const DEFAULT_TEST_DATABASE_URL =
  'postgres://agentic_inbox:agentic_inbox@localhost:5442/agentic_inbox_test';

/**
 * Resolves the test database URL and refuses any URL that could destroy real data.
 *
 * `resetSchema` truncates every app table, so pointing tests at the live
 * database (the one the api server reads/writes via `DATABASE_URL`) wipes it on
 * every run. The guard rejects that: the target must be a dedicated test
 * database (name ending in `_test`) and must differ from `DATABASE_URL`.
 *
 * @returns The vetted test database URL.
 * @throws If the resolved URL is the live database or not a `_test` database.
 */
const resolveTestDatabaseUrl = (): string => {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const liveUrl = process.env.DATABASE_URL;

  if (liveUrl !== undefined && url === liveUrl) {
    throw new Error(
      `Refusing to run destructive tests against DATABASE_URL (${url}). ` +
        'Set TEST_DATABASE_URL to a dedicated test database.'
    );
  }

  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run destructive tests against "${databaseName}": ` +
        'the test database name must end in "_test".'
    );
  }

  return url;
};

/** Postgres pool for tests, pointed at a dedicated `*_test` database. */
export const TestDatabaseLive = PgClient.layer({
  url: Redacted.make(resolveTestDatabaseUrl())
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
