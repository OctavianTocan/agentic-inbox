# Cogram AI App Template

Bun workspace template for AI-heavy take-home projects. It includes a Next.js 16
frontend, an optional Effect v4 backend, Biome, TypeScript 6, Vitest, Vercel AI
SDK wiring, lefthook, and a vendored design system extracted from
`/mnt/work/code/personal/effect-api-layout`.

It also includes repo-local agent skills, CodeGraph support for local semantic
code indexing, and a private Tailscale dev URL recipe for tailnet-only previews.

## Commands

```bash
bun install
bun run dev
bun run dev:api
bun run typecheck
bun run lint
bun run test
bun run build
bun run codegraph:init
bun run codegraph:index
```

## Entry Points

- `apps/web/src/app/page.tsx`: default component showcase and visual smoke test.
- `apps/web/src/app/layout.tsx`: global providers and design-system wiring.
- `apps/web/src/design-system`: reusable tokens, providers, hooks, icons, and UI primitives.
- `apps/web/src/ai-ui`: headless AI message/composer primitives used by styled AI components.
- `apps/api`: Effect v4 backend API, available on port 8001 by default.
- `packages/api-core`: shared API contract and schemas.
- `packages/clients/ai-sdk`: Effect wrapper around the Vercel AI SDK.
- `DESIGN.md`: design-system reference for this template.
- `.agent/skills`: repo-local skills, including Shelf workflow skills.
- `.codegraph/`: local CodeGraph index, ignored by Git.

## AI Setup

Copy `.env.example` to `.env.local` and fill only the provider keys the project
uses. The Vercel AI SDK package is installed as `ai`.

For simple AI apps, using the AI SDK from Next.js server-side code in `apps/web`
is a valid first choice. If the user wants a separate backend, keep the backend
contract in `packages/api-core`, implement handlers in `apps/api`, and wrap all
AI SDK calls through `packages/clients/ai-sdk`.

The backend starts with a mock-safe `/api/v1/ai/draft` handler so it runs without
secrets. To enable a real provider, install the provider package, create a Vercel
AI SDK `LanguageModel`, provide `AiLanguageModel`, and switch the handler layer
from `AiDraftServiceMock` to `AiDraftServiceLive`.

## Verification

`bun run ci` runs Biome, TypeScript, and Vitest. `bun run build` builds the
frontend. Sentrux is binary-first; install it with the upstream instructions,
then run `bun run arch:sentrux`. React Doctor is available through
`bun run react:doctor`.

## Local Code Intelligence

Run `bun run codegraph:install` once per machine to wire CodeGraph into your
agent tools, then run `bun run codegraph:init` in this repo to build the local
project config and `bun run codegraph:index` to build the local graph.
CodeGraph stores the index in `.codegraph/`, which is intentionally ignored.

## Private Preview

For a private tailnet URL, start the web app locally and follow
`docs/tailscale-dev-url.md`. Use `tailscale serve`, verify that the mapping is
tailnet-only, and confirm `tailscale funnel status` is empty before sharing a
URL.
