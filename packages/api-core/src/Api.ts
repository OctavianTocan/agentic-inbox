import { HttpApi, OpenApi } from 'effect/unstable/httpapi';
import { SchemaErrorHandler } from './Middleware';
import { ActionsApi } from './Modules/Actions/Api';
import { ChatApi } from './Modules/Chat/Api';
import { SystemApi } from './Modules/System/Api';
import { TriageApi } from './Modules/Triage/Api';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and docs/agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## HttpApi contracts (`packages/api-core`)
//
// - One `HttpApi` composed of groups/endpoints; handlers live in `apps/api`.
// - Path params use branded domain ids (`EmailId`, `ApprovalId`, `LedgerEntryId`), not bare `Schema.String`.
// - Declare every handler `Effect.fail` error on the endpoint with `httpApiStatus`.
// - Annotate endpoints (`OpenApi.Summary` / `Description`) and shared models (`identifier`).
// - API-level `SchemaErrorHandler` maps decode failures to structured 422s.
// - When unsure, read `repos/effect-smol/packages/effect/HTTPAPI.md` and `docs/agent-patterns/effect-httpapi.md`.
// - Do not import application code from `repos/`.
//</skill-gen>

/** Root HttpApi at `/api/v1`; handlers live in `apps/api`. */
export class Api extends HttpApi.make('api')
  .add(SystemApi)
  .add(TriageApi)
  .add(ActionsApi)
  .add(ChatApi)
  .middleware(SchemaErrorHandler)
  .prefix('/api/v1')
  .annotate(OpenApi.Title, 'Agentic Inbox API')
  .annotate(OpenApi.Version, '0.1.0')
  .annotate(
    OpenApi.Description,
    'Effect v4 backend contract for the Agentic Inbox app.'
  ) {}
