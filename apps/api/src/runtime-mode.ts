/**
 * Read an env var at runtime.
 *
 * Uses dynamic key access so Next/Turbopack cannot inline the value at build
 * time (static `process.env.FOO` would bake local `.env` into the server bundle).
 *
 * @param name - Environment variable name.
 * @returns Trimmed value, or empty string when unset.
 */
function envValue(name: string): string {
  return process.env[name]?.trim() ?? '';
}

/**
 * Whether the process should serve the seeded showcase instead of live Postgres + OpenRouter.
 *
 * Demo mode activates when either `DATABASE_URL` or `OPENROUTER_API_KEY` is missing/blank.
 *
 * @returns True when the demo AppLive path should be used.
 */
export function isDemoMode(): boolean {
  return (
    envValue('DATABASE_URL').length === 0 ||
    envValue('OPENROUTER_API_KEY').length === 0
  );
}
