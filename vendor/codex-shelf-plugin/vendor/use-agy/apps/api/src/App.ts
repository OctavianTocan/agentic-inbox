import { Api } from '@use-agy/api-core/Api';
import { layer as AgyLive } from '@use-agy/effect/Modules/Agy/Service';
import * as Layer from 'effect/Layer';
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder';
import { OPENAPI_PATH } from './Constants';
import { AgyHttpLive } from './Modules/Agy/Http';
import { AgyRpcHttpLive } from './Modules/Agy/Rpc';

/** HTTP API layer with the generated OpenAPI endpoint enabled. */
export const ApiHttpLive = HttpApiBuilder.layer(Api, {
  openapiPath: OPENAPI_PATH,
}).pipe(Layer.provide(AgyHttpLive));

/** Transport routes before the live AGY subprocess layer is provided. */
export const RoutesBaseLive = Layer.mergeAll(ApiHttpLive, AgyRpcHttpLive);

/** Complete local API route layer backed by the live AGY service. */
export const RoutesLive = RoutesBaseLive.pipe(Layer.provide(AgyLive));
