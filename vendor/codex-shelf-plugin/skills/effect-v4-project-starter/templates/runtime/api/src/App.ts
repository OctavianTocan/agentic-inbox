import { Api } from '@{{SCOPE}}/api-core/Api';
import { layer as GreeterLive } from '@{{SCOPE}}/{{PACKAGE}}/Modules/Greeter/Service';
import * as Layer from 'effect/Layer';
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder';
import { OPENAPI_PATH } from './Constants';
import { GreeterHttpLive } from './Modules/Greeter/Http';
import { GreeterRpcHttpLive } from './Modules/Greeter/Rpc';

/** HTTP API layer with the generated OpenAPI endpoint enabled. */
export const ApiHttpLive = HttpApiBuilder.layer(Api, {
  openapiPath: OPENAPI_PATH,
}).pipe(Layer.provide(GreeterHttpLive));

/** Transport routes before the live Greeter service layer is provided. */
export const RoutesBaseLive = Layer.mergeAll(ApiHttpLive, GreeterRpcHttpLive);

/** Complete local API route layer backed by the live Greeter service. */
export const RoutesLive = RoutesBaseLive.pipe(Layer.provide(GreeterLive));
