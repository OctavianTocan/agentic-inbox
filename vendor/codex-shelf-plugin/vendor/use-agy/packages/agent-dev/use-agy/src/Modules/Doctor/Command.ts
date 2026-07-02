import { Agy } from '@use-agy/effect/Modules/Agy/Service';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import { normalizeFailure } from '../../Helpers/Errors';
import {
  jsonFlag,
  outputMode,
  plainFlag,
  stdout,
  writeJson,
} from '../../Helpers/Output';

/** Checks AGY availability and writes the selected output format. */
export const doctorCommand = Command.make(
  'doctor',
  {
    json: jsonFlag,
    plain: plainFlag,
  },
  ({ json, plain }) =>
    Effect.gen(function* () {
      const mode = yield* outputMode({ json, plain });
      const agy = yield* Agy;
      const status = yield* agy
        .status()
        .pipe(Effect.catch((error) => Effect.fail(normalizeFailure(error))));

      if (mode === 'json') {
        return yield* writeJson({ agy: { status } });
      }
      if (mode === 'plain') {
        return yield* stdout(status);
      }
      return yield* stdout(`agy: ${status}`);
    })
).pipe(Command.withDescription('Check whether AGY is available to use-agy.'));
