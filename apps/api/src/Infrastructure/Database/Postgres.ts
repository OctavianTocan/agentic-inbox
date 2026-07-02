import { PgClient } from '@effect/sql-pg';
import { DatabaseConfig } from './Config';

/** Postgres pool providing `PgClient` and `SqlClient`, configured from `DATABASE_URL`. */
export const DatabaseLive = PgClient.layerConfig(DatabaseConfig);
