import { HttpApi, OpenApi } from 'effect/unstable/httpapi';
import { AiApi } from './Modules/Ai/Api';
import { SystemApi } from './Modules/System/Api';

/** Root HttpApi at `/api/v1`; handlers live in `apps/api`. */
export class Api extends HttpApi.make('api')
  .add(SystemApi)
  .add(AiApi)
  .prefix('/api/v1')
  .annotate(OpenApi.Title, 'Cogram Agentic Inbox API')
  .annotate(OpenApi.Version, '0.1.0')
  .annotate(
    OpenApi.Description,
    'Effect v4 backend contract for the Cogram Agentic Inbox app.'
  ) {}
