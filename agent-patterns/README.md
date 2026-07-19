# agent-patterns

Short, pointed distillations of how this repo works. Read the relevant file(s) before changing that area — prefer these plus `repos/effect-smol/LLMS.md` over guessing or web search.

## Effect (library idioms)

| File | When |
|------|------|
| [effect-httpapi.md](./effect-httpapi.md) | HttpApi groups, handlers, clients, branded params |
| [effect-config.md](./effect-config.md) | AppConfig, secrets, demo-mode env exception |
| [effect-schema.md](./effect-schema.md) | Schema.Class, TaggedError, NullOr vs optional |
| [effect-layers-services.md](./effect-layers-services.md) | Context.Service, Body vs Live, AppLive |

## App structure

| File | When |
|------|------|
| [module-layout.md](./module-layout.md) | api-core vs apps/api vs web; Domain/Errors/Api/Http/Service/Repo |
| [repo-sql.md](./repo-sql.md) | Whole-entity repos, decodeSqlRow, ledger append |
| [agent-loop.md](./agent-loop.md) | TriageModel vs ToolModel, tool loop, approvals |
| [sensitive-policy.md](./sensitive-policy.md) | Never auto-action sensitive mail |
| [demo-mode.md](./demo-mode.md) | Missing DB/key → DemoAppLive |

## Web & tooling

| File | When |
|------|------|
| [web-inbox-client.md](./web-inbox-client.md) | HttpApiClient, SSE exceptions, Next bridge |
| [skill-gen.md](./skill-gen.md) | `//<skill-gen>` fragments → `.agent/skills` |
| [ocr.md](./ocr.md) | Open Code Review path rules |
| [testing.md](./testing.md) | Vitest / Layer / ConfigProvider conventions |
| [dataset-and-ids.md](./dataset-and-ids.md) | `emails.json`, branded ids |

## How to use

1. Start Effect work at `repos/effect-smol/LLMS.md` (do not import from `repos/` in app code).
2. Open the matching pattern file for the subsystem you touch.
3. Keep new rules here as **small focused files** — do not grow one mega-doc.
