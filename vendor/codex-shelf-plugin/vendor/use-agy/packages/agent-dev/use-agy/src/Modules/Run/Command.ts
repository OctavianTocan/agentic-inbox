import { Agy } from '@use-agy/effect/Modules/Agy/Service';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import { normalizeFailure } from '../../Helpers/Errors';
import {
  jsonFlag,
  outputMode,
  plainFlag,
  stdout,
  writeJson,
} from '../../Helpers/Output';
import * as RunArguments from './Arguments';

/** Runs AGY and writes captured text output. */
export const runTextCommand = Command.make(
  'text',
  {
    prompt: RunArguments.prompt,
    cwd: RunArguments.cwd,
    model: RunArguments.model,
    sandbox: RunArguments.sandbox,
    timeout: RunArguments.timeout,
    addDirs: RunArguments.addDirs,
    json: jsonFlag,
    plain: plainFlag,
  },
  (input) =>
    Effect.gen(function* () {
      const mode = yield* outputMode(input);
      const agy = yield* Agy;
      const result = yield* agy
        .runText({
          prompt: input.prompt,
          cwd: Option.getOrUndefined(input.cwd),
          model: Option.getOrUndefined(input.model),
          sandbox: Option.getOrUndefined(input.sandbox),
          timeout: Option.getOrUndefined(input.timeout),
          addDirs: input.addDirs,
        })
        .pipe(Effect.catch((error) => Effect.fail(normalizeFailure(error))));

      if (mode === 'json') {
        return yield* writeJson(result);
      }
      return yield* stdout(result.stdout);
    })
).pipe(Command.withDescription('Run AGY and print captured text output.'));

/** Runs AGY and writes stdout parsed as strict JSON. */
export const runJsonCommand = Command.make(
  'json',
  {
    prompt: RunArguments.prompt,
    cwd: RunArguments.cwd,
    model: RunArguments.model,
    sandbox: RunArguments.sandbox,
    timeout: RunArguments.timeout,
    addDirs: RunArguments.addDirs,
  },
  (input) =>
    Effect.gen(function* () {
      const agy = yield* Agy;
      const result = yield* agy
        .runJson({
          prompt: input.prompt,
          cwd: Option.getOrUndefined(input.cwd),
          model: Option.getOrUndefined(input.model),
          sandbox: Option.getOrUndefined(input.sandbox),
          timeout: Option.getOrUndefined(input.timeout),
          addDirs: input.addDirs,
        })
        .pipe(Effect.catch((error) => Effect.fail(normalizeFailure(error))));

      return yield* writeJson(result.value);
    })
).pipe(Command.withDescription('Run AGY and parse stdout as strict JSON.'));

/** Parent command for AGY execution modes. */
export const runCommand = Command.make('run').pipe(
  Command.withDescription('Submit AGY work through the shared service.'),
  Command.withSubcommands([runTextCommand, runJsonCommand])
);
