import { HttpApi, OpenApi } from 'effect/unstable/httpapi';
import { ActionsApi } from './Modules/Actions/Api';
import { ChatApi } from './Modules/Chat/Api';
import { SystemApi } from './Modules/System/Api';
import { TriageApi } from './Modules/Triage/Api';

/** Root HttpApi at `/api/v1`; handlers live in `apps/api`. */
export class Api extends HttpApi.make('api')
  .add(SystemApi)
  .add(TriageApi)
  .add(ActionsApi)
  .add(ChatApi)
  .prefix('/api/v1')
  .annotate(OpenApi.Title, 'Cogram Agentic Inbox API')
  .annotate(OpenApi.Version, '0.1.0')
  .annotate(
    OpenApi.Description,
    'Effect v4 backend contract for the Cogram Agentic Inbox app.'
  ) {}
