#!/usr/bin/env bun
import { BunRuntime, BunServices } from '@effect/platform-bun';
import { layer as AgyLive } from '@use-agy/effect/Modules/Agy/Service';
import * as Effect from 'effect/Effect';
import * as CliError from 'effect/unstable/cli/CliError';
import { runCli } from './Cli';
import { exitCodeFor, normalizeFailure, writeFailure } from './Helpers/Errors';

const program = runCli.pipe(
  Effect.provide(AgyLive),
  Effect.catch((error) => {
    if (CliError.isCliError(error) && error._tag === 'ShowHelp') {
      return Effect.fail(error);
    }

    const failure = normalizeFailure(error);
    process.exitCode = exitCodeFor(failure);
    return writeFailure(failure);
  }),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program, { disableErrorReporting: true });
