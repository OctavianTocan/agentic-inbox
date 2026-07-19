# Effect Config patterns (agentic-inbox)

Source of truth: start with `repos/effect-smol/LLMS.md`, then `repos/effect-smol/packages/effect/CONFIG.md` and Config module sources under `repos/effect-smol/packages/effect/`.

App anchors: `apps/api/src/Infrastructure/AppConfig.ts`, `Infrastructure/Database/Config.ts`, `Modules/Agent/Model.ts`, `runtime-mode.ts`.

## Prefer Effect Config

- Secrets: `Config.redacted('DATABASE_URL')`, `Config.redacted('OPENROUTER_API_KEY')`.
- Knobs: `Config.string` / `Config.int` / `Config.port` with `Config.withDefault(...)`.
- Group with `Config.all({ … })` in `AppConfig`; yield or parse via the active `ConfigProvider`.
- Wire pools/clients with `layerConfig` (`PgClient`, `OpenRouterClient`).

## Demo-mode exception

- `isDemoMode()` in `runtime-mode.ts` **must** read env via dynamic `process.env[name]` so Next/Turbopack cannot bake `.env` into the server bundle.
- Do not replace that gate with Effect Config.

## Tests

- Prefer `ConfigProvider.layer(ConfigProvider.fromUnknown({ … }))` when Effect Config is the source of truth.
- Mutate `process.env` only for demo-mode / Next bundling tests.

## Avoid

- Module-load `process.env` / `Bun.env` for knobs that belong in `AppConfig`.
- `Config.string` + manual `Redacted.make` when `Config.redacted` fits.
- Importing from `repos/effect-smol` in app code.
