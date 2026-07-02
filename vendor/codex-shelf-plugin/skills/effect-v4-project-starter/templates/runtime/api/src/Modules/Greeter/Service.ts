import type {
  GreetRequest,
  GreetResponse,
} from '@{{SCOPE}}/api-core/Modules/Greeter/Domain';
import { EmptyNameError } from '@{{SCOPE}}/api-core/Modules/Greeter/Errors';
import type { EmptyNameError as ServiceEmptyNameError } from '@{{SCOPE}}/{{PACKAGE}}/Modules/Greeter/Errors';
import { Greeter } from '@{{SCOPE}}/{{PACKAGE}}/Modules/Greeter/Service';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

/**
 * Local API facade that maps the shared Greeter service to the public contract.
 *
 * @errors EmptyNameError
 */
export class LocalGreeterApi extends Context.Service<
  LocalGreeterApi,
  {
    /**
     * Builds a greeting for a recipient.
     *
     * @param input - Public greet request.
     * @returns Public greeting response.
     * @errors EmptyNameError when the name is blank.
     */
    readonly greet: (
      input: GreetRequest
    ) => Effect.Effect<GreetResponse, EmptyNameError>;
  }
>()('@apps/{{SCOPE}}-api/Modules/Greeter/LocalGreeterApi') {}

/** Provides the local Greeter API facade over the shared Greeter service. */
export const layer = Layer.effect(
  LocalGreeterApi,
  Effect.gen(function* () {
    const greeter = yield* Greeter;

    return LocalGreeterApi.of({
      greet: (request) =>
        greeter.greet(request).pipe(Effect.mapError(mapGreeterError)),
    });
  })
);

/** Maps shared Greeter service failures into public API errors. */
function mapGreeterError(_error: ServiceEmptyNameError): EmptyNameError {
  return new EmptyNameError();
}
