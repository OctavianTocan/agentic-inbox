---
type: Agent Pattern
title: Web Inbox & Chat Clients
description: HttpApiClient usage in web frontend, SSE transport streams, and Next.js request bridge.
tags: [web, client, httpapi, sse, nextjs]
timestamp: 2026-07-21T22:07:26Z
---

# Web inbox / chat clients (agentic-inbox)

Anchors: `apps/web/src/lib/inbox/client.ts`, `lib/inbox/types.ts`, `lib/chat/http-transport.ts`,
`lib/effect-api-handler.ts`. HttpApi overview: `effect-httpapi.md`.

## JSON routes

```ts
HttpApiClient.make(Api, { baseUrl }).pipe(Effect.provide(FetchHttpClient.layer))
```

Import wire types from `@app/api-core` (re-export via `lib/inbox/types.ts`). No local mirrors.

## SSE exception

Triage run + chat streams may use thin raw `fetch` for `AbortSignal` pause/cancel and UI event narrowing
(`TriageRunEvent`, chat transport events). Prefer api-core event schemas as the source shape.

## Next bridge

`handleEffectApiRequest` → `createApiWebHandler()` (demo vs live). Proxy `/api/v1` via
`AGENTIC_INBOX_API_ORIGIN` rewrites — origin only in env; never ship `OPENROUTER_API_KEY` to the browser.

## Avoid

Hand-rolled `fetch` + duplicated JSON types for endpoints already on `Api`.
