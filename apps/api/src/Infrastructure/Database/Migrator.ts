import { BunServices } from '@effect/platform-bun';
import { PgMigrator } from '@effect/sql-pg';
import { Effect, Layer } from 'effect';
import type { Migrator } from 'effect/unstable/sql';
import { DatabaseLive } from './Postgres';

const loader: Migrator.Loader = Effect.succeed([
  [
    1,
    'initial',
    Effect.promise(() => import('../../../migrations/0001_initial'))
  ]
]);

/** Applies pending migrations during layer construction, on top of {@link DatabaseLive}. */
export const MigratorLive = PgMigrator.layer({ loader }).pipe(
  Layer.provide([DatabaseLive, BunServices.layer])
);

/** Runs pending migrations against the configured Postgres database. */
export const runMigrations = PgMigrator.run({ loader }).pipe(
  Effect.provide([DatabaseLive, BunServices.layer])
);
