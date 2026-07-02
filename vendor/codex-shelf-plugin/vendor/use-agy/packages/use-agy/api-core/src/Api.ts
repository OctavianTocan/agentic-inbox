import * as HttpApi from 'effect/unstable/httpapi/HttpApi';
import * as OpenApi from 'effect/unstable/httpapi/OpenApi';
import { AgyApi } from './Modules/Agy/Api';

/** Root HTTP API contract composition for use-agy. */
export const Api = HttpApi.make('use-agy')
  .add(AgyApi)
  .annotateMerge(
    OpenApi.annotations({
      title: 'use-agy API',
      description: 'Local AGY HTTP contracts',
    })
  );
