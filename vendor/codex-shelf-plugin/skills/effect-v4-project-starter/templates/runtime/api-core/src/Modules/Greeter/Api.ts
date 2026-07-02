import * as HttpApiEndpoint from 'effect/unstable/httpapi/HttpApiEndpoint';
import * as HttpApiGroup from 'effect/unstable/httpapi/HttpApiGroup';
import * as OpenApi from 'effect/unstable/httpapi/OpenApi';
import { GreetRequest, GreetResponse } from './Domain';
import { EmptyNameErrorResponse } from './Errors';

/** HTTP API group for the Greeter contract. */
export const GreeterApi = HttpApiGroup.make('greeter')
  .add(
    HttpApiEndpoint.post('greet', '/greet', {
      payload: GreetRequest,
      success: GreetResponse,
      error: EmptyNameErrorResponse,
    }).annotate(OpenApi.Summary, 'Greet a named recipient')
  )
  .prefix('/greeter');
