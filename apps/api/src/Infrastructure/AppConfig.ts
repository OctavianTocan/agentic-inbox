import { Config } from 'effect';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## Effect Config (`AppConfig`)
//
// - Non-secret knobs live in `$$file` via `Config.all` + `withDefault` (`PORT`, `API_HOST`, `OPENROUTER_MODEL`, triage pacing).
// - Secrets: `Config.redacted` on `layerConfig` surfaces (`DATABASE_URL`, `OPENROUTER_API_KEY`).
// - Demo-mode gate stays raw dynamic `process.env` in `runtime-mode.ts` (Next bundling).
// - Tests: prefer `ConfigProvider.layer(ConfigProvider.fromUnknown(…))` when Effect Config is SoT.
// - See `repos/effect-smol/packages/effect/CONFIG.md` and `agent-patterns/effect-config.md`.
//</skill-gen>

/**
 * Process-wide Effect config for non-secret knobs.
 *
 * Secrets (`DATABASE_URL`, `OPENROUTER_API_KEY`) stay on their `layerConfig`
 * surfaces. Demo-mode gating stays on raw dynamic `process.env` in
 * `runtime-mode.ts` so Next cannot bake `.env` into the server bundle.
 */
export const AppConfig = Config.all({
  openRouterModel: Config.string('OPENROUTER_MODEL').pipe(
    Config.withDefault('openai/gpt-5.5')
  ),
  port: Config.port('PORT').pipe(Config.withDefault(8001)),
  host: Config.string('API_HOST').pipe(Config.withDefault('127.0.0.1')),
  triageConcurrency: Config.int('TRIAGE_CONCURRENCY').pipe(
    Config.withDefault(1)
  ),
  triageGapMs: Config.int('TRIAGE_GAP_MS').pipe(Config.withDefault(2_000))
});

/** Resolved shape of {@link AppConfig}. */
export type AppConfigValues = Config.Success<typeof AppConfig>;
