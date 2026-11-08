import { createApiWebHandler } from '@apps/api/WebHandler';

const { handler } = createApiWebHandler();

/**
 * Forward a Next.js App Router `Request` to the Effect `AppLive` web handler.
 *
 * @param request - Incoming Web Request (URL path must match Effect routes).
 * @returns Effect HTTP Response.
 */
export function handleEffectApiRequest(request: Request): Promise<Response> {
  return handler(request);
}
