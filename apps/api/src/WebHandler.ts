import { Layer } from 'effect';
import { HttpRouter, HttpServer } from 'effect/unstable/http';
import { AppLive } from './App';
import { DemoAppLive } from './Modules/Demo/Layers';
import { isDemoMode } from './runtime-mode';

/** Options for {@link createApiWebHandler}. */
export type ApiWebHandlerOptions = {
  /** When true, skip Effect HTTP request logging (useful in unit tests). */
  readonly disableLogger?: boolean;
};

/** Web-standard handler plus dispose for releasing layer resources. */
export type ApiWebHandler = {
  /** Handle one Fetch API request. */
  readonly handler: (request: Request) => Promise<Response>;
  /** Tear down the layer graph (e.g. Postgres pool when live). */
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
