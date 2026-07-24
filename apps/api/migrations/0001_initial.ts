import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

/**
 * Creates the product Postgres schema: decisions, triage_runs, action_ledger,
 * conversations (chat), trace_events, and eval experiment tables.
 */
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
      policy_reasons JSONB NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )
  `;

  // Product record of one triage attempt for one email (runId === thread_id).
  yield* sql`
    CREATE TABLE IF NOT EXISTS triage_runs (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL,
      status TEXT NOT NULL,
      proposal TEXT NULL,
      proposal_summary TEXT NULL,
      pending JSONB NULL,
      decision_snapshot JSONB NULL,
      policy_version TEXT NULL,
      prompt_version TEXT NULL,
      graph_version TEXT NULL,
      error TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  yield* sql`CREATE INDEX IF NOT EXISTS triage_runs_email_id_idx ON triage_runs(email_id)`;

  yield* sql`CREATE INDEX IF NOT EXISTS triage_runs_status_idx ON triage_runs(status)`;

  yield* sql`
    CREATE TABLE IF NOT EXISTS action_ledger (
      id TEXT PRIMARY KEY,
      run_id TEXT NULL REFERENCES triage_runs(id) ON DELETE CASCADE,
      actor TEXT NOT NULL,
      email_id TEXT NOT NULL,
      action TEXT NOT NULL,
      action_revision INTEGER NOT NULL DEFAULT 1,
      summary TEXT NOT NULL,
      payload JSONB NOT NULL,
      undone_by TEXT REFERENCES action_ledger(id),
      undoes TEXT REFERENCES action_ledger(id),
      created_at TEXT NOT NULL
    )
  `;

  // Idempotency for triage effects only. NULL run_id (e.g. chat undo) is
  // intentionally excluded so multiple non-run ledger rows are allowed.
  yield* sql`
    CREATE UNIQUE INDEX IF NOT EXISTS action_ledger_run_action_revision_uidx
    ON action_ledger (run_id, action, action_revision)
    WHERE run_id IS NOT NULL
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

  yield* sql`
    CREATE TABLE IF NOT EXISTS trace_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES triage_runs(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      ts TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL,
      UNIQUE (run_id, seq)
    )
  `;

  yield* sql`CREATE INDEX IF NOT EXISTS trace_events_run_id_idx ON trace_events(run_id)`;

  yield* sql`
    CREATE TABLE IF NOT EXISTS eval_experiments (
      id TEXT PRIMARY KEY,
      commit_sha TEXT NOT NULL,
      graph_version TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      model_id TEXT NOT NULL,
      dataset_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      metrics JSONB NOT NULL
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS eval_case_results (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES eval_experiments(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL,
      passed BOOLEAN NOT NULL,
      run_id TEXT NULL REFERENCES triage_runs(id) ON DELETE SET NULL,
      details JSONB NULL
    )
  `;
});
