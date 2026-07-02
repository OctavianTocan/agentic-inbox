#!/usr/bin/env bun
import { BunRuntime } from '@effect/platform-bun';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { formatConfigError, loadServerConfig, serverOrigin } from './Config';
import { makeServerLayer } from './Server';

const program = Effect.gen(function* () {
  const config = yield* loadServerConfig;
  yield* Console.error(`use-agy api listening on ${serverOrigin(config)}`);
  return yield* Layer.launch(makeServerLayer(config));
}).pipe(
  Effect.catch((error) => {
    process.exitCode = 2;
    return Console.error(`error: ${formatConfigError(error)}`);
  })
);

BunRuntime.runMain(program, { disableErrorReporting: true });
