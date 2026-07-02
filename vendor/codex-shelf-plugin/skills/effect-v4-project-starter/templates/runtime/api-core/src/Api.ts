import * as HttpApi from 'effect/unstable/httpapi/HttpApi';
import * as OpenApi from 'effect/unstable/httpapi/OpenApi';
import { GreeterApi } from './Modules/Greeter/Api';

/** Root HTTP API contract composition for {{SCOPE}}. */
export const Api = HttpApi.make('{{SCOPE}}')
  .add(GreeterApi)
  .annotateMerge(
    OpenApi.annotations({
      title: '{{SCOPE}} API',
      description: 'Greeter HTTP contracts',
    })
  );
