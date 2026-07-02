import { Greeter } from '@{{SCOPE}}/{{PACKAGE}}/Modules/Greeter/Service';
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
import * as GreetArguments from './Arguments';

/** Greets a recipient and writes the selected output format. */
export const greetCommand = Command.make(
  'greet',
  {
    name: GreetArguments.name,
    json: jsonFlag,
    plain: plainFlag,
  },
  (input) =>
    Effect.gen(function* () {
      const mode = yield* outputMode(input);
      const greeter = yield* Greeter;
      const result = yield* greeter
        .greet({ name: input.name })
        .pipe(Effect.catch((error) => Effect.fail(normalizeFailure(error))));

      if (mode === 'json') {
        return yield* writeJson(result);
      }
      return yield* stdout(result.message);
    })
).pipe(Command.withDescription('Greet a named recipient.'));

/** Reports whether the Greeter service is ready to use. */
export const doctorCommand = Command.make(
  'doctor',
  {
    json: jsonFlag,
    plain: plainFlag,
  },
  ({ json, plain }) =>
    Effect.gen(function* () {
      const mode = yield* outputMode({ json, plain });
      yield* Greeter;

      if (mode === 'json') {
        return yield* writeJson({ greeter: { status: 'ready' } });
      }
      if (mode === 'plain') {
        return yield* stdout('ready');
      }
      return yield* stdout('greeter: ready');
    })
).pipe(
  Command.withDescription('Check whether the Greeter service is available.')
);
