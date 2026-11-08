import { Api, SchemaErrorHandlerLive } from '@app/api-core';
import { Layer } from 'effect';
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi';
import { CoreModulesLive } from './Modules/Layers';

/** Root backend layer: API routes, OpenAPI at `/openapi.json`, Scalar docs at `/docs`. */
export const AppLive = Layer.mergeAll(
  HttpApiBuilder.layer(Api, { openapiPath: '/openapi.json' }).pipe(
    Layer.provide(CoreModulesLive),
    Layer.provide(SchemaErrorHandlerLive)
  ),
  HttpApiScalar.layer(Api, { path: '/docs' })
);
