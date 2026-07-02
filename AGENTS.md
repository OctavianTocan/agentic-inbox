<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instructions

## Project Shape

- This is a Bun workspace template with a Next.js frontend and an optional Effect v4 backend.
- `apps/web` is the Next.js 16 App Router frontend.
- `apps/api` is the Effect v4 backend API.
- `packages/api-core` owns the HTTP API contract and schemas.
- `packages/clients/ai-sdk` wraps the Vercel AI SDK in Effect.
- Use `apps/web/src/design-system` before adding new UI primitives.
- Use `apps/web/src/ai-ui` for headless AI composer/thread behavior.
- Keep frontend imports local: `@/design-system/...`, `@/ai-ui/...`, and `@/...`.
- Design intent lives in `DESIGN.md`.
- CodeGraph local indexes live in `.codegraph/` and are ignored by Git.
- Keep `vendor/`, `.agent/`, `.codegraph/`, and generated `.next/` output out of
  TypeScript LSP project discovery.

## Skills

Repo-local skills live in `.agent/skills`.

- `domain-design`: visual language and interaction rules from the source design system.
- `domain-frontend`: frontend architecture, component anatomy, testing, and Next.js conventions.
- `practice-code-quality`: TypeScript/code-quality guardrails.
- `practice-debug`: debugging workflow.
- `effect-v4-project-starter`: Effect v4 backend/workspace shape.
- `workflow-test-gen`: test planning and generation.
- `cleanup-unused-project-surface`: unused backend, frontend, UI, and design
  surface audit with verifiable non-usage evidence.
- `gen-github-workflow`: workflow-generation reference.
- `gen-skills`: skill-generation reference.
- `shelf-workflow-plan`: Shelf planning workflow.
- `shelf-workflow-gen`: Shelf workflow-fragment generation reference.
- `ponytail`: minimal-diff ladder for avoiding overbuild.
- `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`: Ponytail review and maintenance helpers.

Activate the relevant skill before changing the matching area. For substantial
design work, read `domain-design` and `domain-frontend` first.

## Working Rules

- Read the files you touch and obvious callers before editing.
- Prefer the smallest working change.
- Keep frontend-only AI experiments in `apps/web` unless the user chooses a backend.
- When the user chooses a backend, put contracts in `packages/api-core`, handlers in `apps/api`, and AI SDK integration behind `packages/clients/ai-sdk`.
- Use Effect v4 beta pins from the root workspace catalog; do not accidentally install Effect v3.
- No default exports except Next.js route/page/layout files.
- Tests live in package-level `test/` directories.
- Use `bun`/`bunx`, not npm/yarn/pnpm.
- Use CodeGraph for architecture/code-navigation questions when the local graph
  exists; fall back to `rg` when it does not.
- Use `tailscale serve` only for private dev previews; do not use Funnel unless
  the user explicitly requests public exposure.

## Verification

- Run `bun run typecheck`, `bun run lint`, and `bun run test` before calling work complete.
- Run `bun run build` after changes to routing, app layout, or production config.
- Run `bun run dev:api` to smoke the backend locally; health is `GET /api/v1/health`, docs are `/docs`.
- Run `bun run react:doctor` for React-specific audits when changing component behavior.
- Run `bun run arch:sentrux` when Sentrux is installed locally.
