import { Layer } from 'effect';
import { HttpRouter, HttpServer } from 'effect/unstable/http';
import { AppLive } from './App';

export type ApiWebHandlerOptions = {
  readonly disableLogger?: boolean;
};

export type ApiWebHandler = {
  readonly handler: (request: Request) => Promise<Response>;
  readonly dispose: () => Promise<void>;
};

/**
 * Build a Web `Request` → `Response` handler from `AppLive` for Next / serverless.
 *
 * @param options - Optional router options (e.g. disable request logging in tests).
 * @returns Handler plus dispose for releasing layer resources (including the Postgres pool).
 */
export function createApiWebHandler(
  options: ApiWebHandlerOptions = {}
): ApiWebHandler {
  const appLayer = AppLive.pipe(Layer.provide(HttpServer.layerServices));
  const { handler, dispose } =
    options.disableLogger === true
      ? HttpRouter.toWebHandler(appLayer, { disableLogger: true })
      : HttpRouter.toWebHandler(appLayer);

  return {
    handler: (request) => handler(request),
    dispose
  };
}
