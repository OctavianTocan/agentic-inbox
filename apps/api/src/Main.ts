import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { Layer } from 'effect';
import { HttpRouter } from 'effect/unstable/http';
import { AppLive } from './App';

const PORT = Number(Bun.env.PORT ?? '8001');

const HttpServerLive = HttpRouter.serve(AppLive).pipe(
  Layer.provide(
    BunHttpServer.layer({
      hostname: '127.0.0.1',
      port: PORT,
      idleTimeout: 255
    })
  ),
  Layer.orDie
);

Layer.launch(HttpServerLive).pipe(BunRuntime.runMain);
