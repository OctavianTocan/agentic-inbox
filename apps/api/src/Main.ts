import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { Layer } from 'effect';
import { HttpRouter } from 'effect/unstable/http';
import { AppLive } from './App';

/** Root port for local API process startup. */
const PORT = Number(Bun.env.PORT ?? '8001');
const HOST = Bun.env.API_HOST ?? '127.0.0.1';

const HttpServerLive = HttpRouter.serve(AppLive).pipe(
  Layer.provide(
    BunHttpServer.layer({
      hostname: HOST,
      port: PORT,
      idleTimeout: 0
    })
  ),
  Layer.orDie
);

Layer.launch(HttpServerLive).pipe(BunRuntime.runMain);
