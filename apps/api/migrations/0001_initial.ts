import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

/** Creates the decisions, action_ledger, and conversations tables. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS decisions (
      email_id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL,
      why_preview TEXT NOT NULL,
      rationale TEXT NOT NULL,
      key_facts JSONB NOT NULL,
      is_sensitive BOOLEAN NOT NULL,
      created_at TEXT NOT NULL
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS action_ledger (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      email_id TEXT NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload JSONB NOT NULL,
      undone_by TEXT REFERENCES action_ledger(id),
      undoes TEXT REFERENCES action_ledger(id),
      created_at TEXT NOT NULL
    )
  `;

  yield* sql`CREATE INDEX IF NOT EXISTS action_ledger_email_id_idx ON action_ledger(email_id)`;

  yield* sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      prompt JSONB NOT NULL,
      pending JSONB,
      email_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
});
