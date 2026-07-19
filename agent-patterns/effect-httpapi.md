# Effect HttpApi patterns (agentic-inbox)

Source of truth for APIs: start with `repos/effect-smol/LLMS.md`, then `repos/effect-smol/packages/effect/HTTPAPI.md` and `repos/effect-smol/packages/effect/src/unstable/httpapi/`.

App anchors: `packages/api-core` (contracts), `apps/api` (handlers), Scalar at `/docs`, OpenAPI via `OpenApi.fromApi`.

## Contract shape

- One `HttpApi` composed of `HttpApiGroup`s of `HttpApiEndpoint`s.
- Schemas first: `params`, `query`, `payload`, `success`, `error`.
- Path params use **branded domain ids** (`EmailId`, `ApprovalId`, `LedgerEntryId`), not bare `Schema.String`.
- Tagged errors live in `Errors.ts` with `{ httpApiStatus: N }` (or `HttpApiSchema.status`).
- Endpoint `error:` must list every error the handler `Effect.fail`s.
- Annotate endpoints with `OpenApi.Summary` / `OpenApi.Description`; shared structs with `identifier` + `description`.

## Handlers

- `HttpApiBuilder.group(Api, 'groupName', …)` then `handlers.handle('endpoint', …)`.
- Fail with declared error schemas via `Effect.fail` — do **not** `Effect.die` / `orDie` domain errors that belong in OpenAPI.
- Do **not** `Schema.decodeUnknownSync` path/body ids in handlers; the endpoint codec already decoded them.
- Infra defects (`ConfigError`, `AiError`) may stay defects unless declared as typed 5xx schemas.

## Client

- Prefer `HttpApiClient.make(Api, { baseUrl })` + `FetchHttpClient.layer` over hand-rolled `fetch`.
- Import wire types from `@app/api-core`, not local mirrors.
- SSE endpoints may still need a thin UI adapter around the client stream.

## Serving

- Bun: `HttpRouter.serve` + `BunHttpServer`.
- Next: `HttpRouter.toWebHandler` + `HttpServer.layerServices`.
- Docs: `HttpApiScalar.layer(Api)` (not Swagger).

## Avoid

- Defining HttpApi schemas only in `apps/api`.
- Catch-all `*` unless you truly need it (not in OpenAPI).
- Importing from `repos/effect-smol` in app code.
