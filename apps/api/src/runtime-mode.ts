/**
 * Whether the process should serve the seeded showcase instead of live Postgres + OpenRouter.
 *
 * Demo mode activates when either `DATABASE_URL` or `OPENROUTER_API_KEY` is missing/blank.
 *
 * @returns True when the demo AppLive path should be used.
 */
export function isDemoMode(): boolean {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() ?? '';
  return databaseUrl.length === 0 || openRouterKey.length === 0;
}
