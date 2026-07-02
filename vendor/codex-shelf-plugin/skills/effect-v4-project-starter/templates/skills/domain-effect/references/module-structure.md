# Module Structure

Standard structure for backend Effect-TS modules. Every module and sub-module follows the same pattern recursively.

## File Structure

```
Module/
  Domain.ts        -- Types, schemas, branded types, domain Context.Tags
  Tags.ts          -- Context.Tag declarations when separate from Domain.ts
  Service.ts       -- Effect.Service class with business logic
  Errors.ts        -- TaggedError classes
  Repo.ts          -- Database access layer (if persistent)
  Api.ts           -- HttpApiGroup contract definition
  RpcProtocol.ts   -- RpcGroup contract definition
  Http.ts          -- HTTP transport handler (HttpApiBuilder.group)
  Rpc.ts           -- RPC transport handler (RpcGroup.toLayer)
  Policy.ts        -- Authorization policies for the module's handlers
  Constants.ts     -- Constants and reference data (no logic)
  Events.ts        -- Event payload Schema.TaggedClass instances
  Config.ts        -- Environment-driven configuration (Effect Config + Context.Tag)
  Context.ts       -- Effect.Service context tags when separate from Domain.ts
  State.ts         -- Mutable Ref-backed state (when distinct from Service)
  Prompts.ts       -- Prompt section factories (agent modules)
  Checks.ts        -- Validation/guard logic
  Helpers.ts       -- Pure utility functions (single file, no Effect.Service)
  Toolbox.ts       -- Tool aggregation (if has tools)
  Tools/           -- Individual tool files (each is an Effect.Service)
  Helpers/         -- Pure utility functions when one file is not enough
  Modules/         -- Sub-modules (each follows the same pattern recursively)
    SubModule/
      Domain.ts
      Service.ts
      Errors.ts
      ...
```

## Core Files (required)

| File | Contains | Never contains |
|------|----------|----------------|
| **Domain.ts** | Types, Schema classes, branded types, Context.Tags for domain concepts, interfaces | Business logic, side effects |
| **Service.ts** | `Effect.Service` class, business logic, the module's primary service | Raw DB access, type-only code |
| **Errors.ts** | `Schema.TaggedError` classes. All names end with `Error` | Business logic |

## Data Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Repo.ts** | Database access via Effect SQL. Thin data layer, no business logic | Module has persistent storage (SQLite, Postgres) |
| **Constants.ts** | Constants and reference data (default names, pricing tables, lookup maps) | Module has reference data with no logic attached |

## Contract & Transport Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Api.ts** | `HttpApiGroup.make(...)` endpoint definitions (the HTTP contract) | Module exposes an HTTP API |
| **RpcProtocol.ts** | `RpcGroup.make(...)` request definitions (the RPC contract) | Module exposes RPC endpoints |
| **Http.ts** | `HttpApiBuilder.group(...)` handlers implementing an `Api.ts` contract | Module implements its HTTP API |
| **Rpc.ts** | `RpcGroup.toLayer(...)` handlers implementing a `RpcProtocol.ts` contract | Module implements its RPC endpoints |
| **Policy.ts** | Authorization policies gating handler access | Module's handlers need authorization checks |
| **Events.ts** | Event payload `Schema.TaggedClass` instances emitted on a runtime bus | Module emits domain events on a bus |

## Configuration Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Config.ts** | `Config.all({...})` for env vars + `Context.Tag` + `Layer.effect` for defaults | Module has environment-driven configuration (e.g. `HARNESS_IDLE_TIMEOUT_MS`) |

## State Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Tags.ts** | `Context.Tag` declarations for the module | Module's context tags must live outside `Domain.ts` to break an import cycle (e.g. Agent.Identity, Agent.Def) |
| **Context.ts** | Multiple `Effect.Service` context tag classes | Module provides several scoped context tags that don't belong in Domain.ts |
| **State.ts** | Ref-backed mutable state with an interface + `make` factory | Module has mutable per-instance state distinct from its primary Service (e.g. turn-scoped registries) |
| **TurnState.ts** | Turn-scoped Ref-backed state | Module has state that resets each turn, separate from persistent agent-scoped state in Service.ts |

State files are implementation-layer files. Never place mutable state in API/RPC contract files (`Api.ts`, `RpcProtocol.ts`) or transport handler files (`Http.ts`, `Rpc.ts`); expose state through a service method and wire that service at the boundary.

## Agent-Specific Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Prompts.ts** | Factory functions returning `PromptSection` objects (`Section.of(...)`) | Module contributes dynamic prompt sections (catalogs, context injections) |
| **Checks.ts** | Validation or guard logic (e.g. branch state validation) | Module needs reusable validation separate from Service |

## Tool Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Toolbox.ts** | Aggregates tools from `Tools/` via `Toolbox.make()` | Module exposes tools to the agent |
| **Tools/** | One file per tool, each an `Effect.Service` using `Tool.make()` | Module has agent-callable tools |

## Organization Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Helpers.ts** | Pure utility functions, formatters, transformers (single file) | Module needs a handful of pure helpers that aren't an Effect.Service |
| **Helpers/** | Pure utility functions split across files | One `Helpers.ts` outgrows a single file |
| **Modules/** | Sub-modules following the same pattern recursively | A concern within the module needs its own Domain + Service + Errors |

## When to Use What

| Concern | Where it goes |
|---------|--------------|
| Only types or schemas | `Domain.ts` |
| Context.Tags that must avoid a `Domain.ts` import cycle | `Tags.ts` |
| Business logic with an Effect.Service | `Service.ts` |
| HTTP API contract | `Api.ts` |
| RPC contract | `RpcProtocol.ts` |
| HTTP handlers implementing the contract | `Http.ts` |
| RPC handlers implementing the contract | `Rpc.ts` |
| Authorization policies for handlers | `Policy.ts` |
| Constants and reference data | `Constants.ts` |
| Event payloads emitted on a bus | `Events.ts` |
| Environment configuration with defaults | `Config.ts` |
| Multiple scoped context tags | `Context.ts` |
| Mutable Ref-backed state (not the primary service) | `State.ts`, `TurnState.ts`, or `Store.ts` |
| Hook handlers or hook event definitions | `Hooks.ts` |
| Prompt section factories | `Prompts.ts` |
| Validation/guard logic | `Checks.ts` |
| Needs own Domain + Service + Errors | Sub-module in `Modules/` |
| A few pure functions, no Effect.Service | `Helpers.ts` |
| Many pure functions across files | `Helpers/` directory |
| Individual tool definitions | `Tools/` directory |
| Tool aggregation | `Toolbox.ts` |
| Database access | `Repo.ts` |

## Naming Rules

- Standard files use exact names: `Domain.ts`, `Tags.ts`, `Service.ts`, `Errors.ts`, `Repo.ts`, `Api.ts`, `RpcProtocol.ts`, `Http.ts`, `Rpc.ts`, `Policy.ts`, `Constants.ts`, `Events.ts`, `Config.ts`, `Context.ts`, `State.ts`, `Store.ts`, `Hooks.ts`, `Prompts.ts`, `Checks.ts`, `Helpers.ts`, `Toolbox.ts`
- **Never** use `Registry.ts` as a module's primary service -- rename to `Service.ts`
- **Never** use standalone `State.ts` as a module's primary service -- put state logic in `Service.ts`
- **No loose files** at module root beyond the recognized set or a domain-skill documented exception. Extra files go in `Helpers/`, `Tools/`, or `Modules/`
- **Do not add `index.ts` barrels.** Import directly from the concrete module file. Keep pre-existing runtime-required indexes only when a domain skill documents the exception.
- PascalCase for all backend Effect file and directory names
- Error types always end with `Error` (e.g. `AgentNotFoundError`)

## Sub-Modules

When a concern within a module needs its own Domain + Service + Errors, it becomes a sub-module under `Modules/`. Sub-modules follow the exact same pattern recursively.

```
Parent/
  Domain.ts
  Service.ts
  Errors.ts
  Modules/
    Child/              -- Sub-module with its own structure
      Domain.ts
      Service.ts
      Helpers/
        Transform.ts
```

## Examples

**Simple module (Messages):**
```
Messages/
  Domain.ts    -- Message (Schema.Class), MessageRole, MessageRow types
  Service.ts   -- Messages Effect.Service (append, getHistory)
  Errors.ts    -- EmptyMessagesError
  Repo.ts      -- MessagesRepo (Effect SQL access)
```

**Module with tools (Tasks):**
```
Tasks/
  Domain.ts    -- TaskInsert, TaskUpdate types
  Service.ts   -- Tasks Effect.Service (CRUD)
  Errors.ts    -- TaskNotFoundError
  Repo.ts      -- TasksRepo
  Toolbox.ts   -- TasksToolbox
  Tools/
    TaskCreate.ts
    TaskGet.ts
    TaskList.ts
    TaskUpdate.ts
```

**Module with config (ActivityTracker):**
```
ActivityTracker/
  Service.ts   -- ActivityTracker Effect.Service
  Config.ts    -- ActivityTrackerConfig (env vars with defaults)
```

**Agent module with Context.Tags and DB-backed store (Agent):**
```
Agent/
  Domain.ts    -- AgentDefinition, PrepareStepContext
  Tags.ts      -- AgentName, AgentIdentity (Context.Tag), AgentDef (Context.Tag)
  Hooks.ts     -- Agent{Stopped,Failed,Idle,ArchiveBefore,Archived} events
  Service.ts   -- AgentDefinitionMake factory (make, makeWithState)
  Store.ts     -- AgentStore (Effect.Service, DB-backed K-V via AgentState)
  Errors.ts    -- AgentDefinitionNotFoundError
  Helpers/
    Resolvable.ts -- Resolvable<T>, resolve()
```

**Module with prompts (Harness):**
```
Harness/
  Domain.ts    -- TurnContext, AuthResolver, HarnessAgent, SendOptions
  Service.ts   -- AgentHarness daemon (queue processing, agent lifecycle)
  Errors.ts    -- AgentHarnessError, QueueEntryNotFoundError
  Prompts.ts   -- Catalog prompt section factories (skills, tools)
```

**Agent-scoped state with activation tracking (Skills):**
```
Skills/
  Domain.ts    -- Skill (Schema.Class), SkillDefinition (interface, effectful content)
  State.ts     -- SkillState (Effect.Service, Ref-backed, agent-scoped)
  Errors.ts    -- SkillNotFoundError
  Toolbox.ts   -- SkillsToolbox
  Tools/
    ActivateSkill.ts
    DeactivateSkill.ts
```

**Module with prompt state (PromptBuilder):**
```
PromptBuilder/
  Domain.ts    -- PromptDefinition, PromptSection, Reminder types
  Service.ts   -- PromptBuilder (tier assembly, section resolution)
  State.ts     -- PromptState (Effect.Service, mutable prompt composition)
  Helpers/
    Assembly.ts  -- prompt assembly and reminder injection utilities
```
