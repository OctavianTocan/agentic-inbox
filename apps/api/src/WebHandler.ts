import { Layer } from 'effect';
import { HttpRouter, HttpServer } from 'effect/unstable/http';
import { AppLive } from './App';
import { DemoAppLive } from './Modules/Demo/Layers';
import { isDemoMode } from './runtime-mode';

export type ApiWebHandlerOptions = {
  readonly disableLogger?: boolean;
};

export type ApiWebHandler = {
  readonly handler: (request: Request) => Promise<Response>;
  readonly dispose: () => Promise<void>;
};

/**
 * Build a Web `Request` → `Response` handler for Next / serverless.
 *
 * Uses the seeded demo AppLive when `DATABASE_URL` or `OPENROUTER_API_KEY` is
 * missing; otherwise the full live stack.
 *
 * @param options - Optional router options (e.g. disable request logging in tests).
 * @returns Handler plus dispose for releasing layer resources (including the Postgres pool when live).
 */
export function createApiWebHandler(
  options: ApiWebHandlerOptions = {}
): ApiWebHandler {
  const root = isDemoMode() ? DemoAppLive : AppLive;
  const appLayer = root.pipe(Layer.provide(HttpServer.layerServices));
  const { handler, dispose } =
    options.disableLogger === true
      ? HttpRouter.toWebHandler(appLayer, { disableLogger: true })
      : HttpRouter.toWebHandler(appLayer);

  return {
    handler: (request) => handler(request),
    dispose
  };
}
