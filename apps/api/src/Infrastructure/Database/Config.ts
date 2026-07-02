import type { PgClient } from '@effect/sql-pg';
import { Config } from 'effect';

/** Effect config for the Postgres pool, read from `DATABASE_URL`. */
export const DatabaseConfig: Config.Wrap<PgClient.PgPoolConfig> = {
  url: Config.redacted('DATABASE_URL')
};
