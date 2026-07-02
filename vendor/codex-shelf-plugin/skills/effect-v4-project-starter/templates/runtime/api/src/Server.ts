import { BunHttpServer } from '@effect/platform-bun';
import * as Layer from 'effect/Layer';
import * as HttpRouter from 'effect/unstable/http/HttpRouter';
import { RoutesLive } from './App';
import type { ServerConfig } from './Config';

/**
 * Builds the Bun HTTP server layer for a validated local config.
 *
 * @param config - Validated loopback server config.
 * @returns Layer that launches the HTTP server when scoped.
 */
export const makeServerLayer = (config: ServerConfig) =>
  HttpRouter.serve(RoutesLive, {
    disableLogger: true,
    disableListenLog: true,
  }).pipe(
    Layer.provide(
      BunHttpServer.layer({
        hostname: config.hostname,
        port: config.port,
      })
    )
  );
