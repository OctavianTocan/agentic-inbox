import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { Effect, Layer } from 'effect';
import { HttpRouter } from 'effect/unstable/http';
import { AppLive } from './App';
import { AppConfig } from './Infrastructure/AppConfig';

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const { host, port } = yield* AppConfig;
    return HttpRouter.serve(AppLive).pipe(
      Layer.provide(
        BunHttpServer.layer({
          hostname: host,
          port,
          idleTimeout: 0
        })
      ),
      Layer.orDie
    );
  })
);

Layer.launch(HttpServerLive).pipe(BunRuntime.runMain);
