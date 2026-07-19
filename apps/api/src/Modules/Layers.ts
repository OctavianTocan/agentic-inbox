import { Layer } from 'effect';
import { HttpActionsLive } from './Actions/Http';
import { ActionServiceLive } from './Actions/Service';
import { AgentServiceLive } from './Agent/Service';
import { HttpChatLive } from './Chat/Http';
import { HttpSystemLive } from './System/Http';
import { HttpTriageLive } from './Triage/Http';
import { TriageServiceLive } from './Triage/Service';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// # Backend Surface Design (agentic-inbox)
//
// Principles for *what* to expose on the Effect API and *how* to structure backend
// modules in this shared-inbox workspace.
//
// For TypeScript quality see `practice-code-quality`. For UI product design see
// `domain-design`. For React/Next implementation see `domain-frontend`.
// Full file-split checklist: [module-layout.md](references/module-layout.md).
//
// ## Product constraints (backend-relevant)
//
// - **Sensitive emails must never be auto-actioned.**
// - **Every agent action must be legible** in plain language per email.
// - **Wrong calls must be cheaply reversible** (undo / re-triage).
// - **The email dataset is static** — `data/emails.json`, ids `e-001`..`e-080`.
//
// ## Before you design
//
// 1. Match existing modules — Domain / Errors / Api / Service / Repo split.
// 2. Prefer extending `@app/api-core` schemas before inventing parallel types.
// 3. Compose HTTP layers in `$$file` (`CoreModulesLive`).
// 4. Before writing Effect code, read `repos/effect-smol/LLMS.md`, then `agent-patterns/`.
//
// ## Codebase anchors
//
// | Concern | Path |
// |---------|------|
// | HTTP contracts | `packages/api-core/src/Modules/` (`@app/api-core`) |
// | Runtime modules | `apps/api/src/Modules/` |
// | Layer merge | `$$file` |
// | Postgres migrator | `apps/api/src/Infrastructure/Database/` |
// | Vendored Effect | `repos/effect-smol/` (read-only; see `repos/README.md`) |
// | Agent pattern files | `agent-patterns/` |
//
// ## Quick reference
//
// - Schemas in api-core; handlers/repos in `apps/api`.
// - Mutable repos: whole-entity `upsert`; no per-field writers.
// - Second aggregate → sub-module folder on both packages.
// - Default answer to new public routes is no — extend existing groups.
// - Never auto-action sensitive mail.
// - Do not import from `repos/`; prefer it over web search for Effect idioms.
//</skill-gen>

/** Merged runtime layers for every HttpApi group. */
export const CoreModulesLive = Layer.mergeAll(
  HttpSystemLive,
  HttpTriageLive.pipe(Layer.provide(TriageServiceLive)),
  HttpActionsLive.pipe(Layer.provide([ActionServiceLive, AgentServiceLive])),
  HttpChatLive.pipe(Layer.provide(AgentServiceLive))
);
