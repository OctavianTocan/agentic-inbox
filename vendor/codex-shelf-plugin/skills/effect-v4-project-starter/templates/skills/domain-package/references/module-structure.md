# Module Structure

Standard layout for Effect-TS packages in this repo. Small packages keep a flat `src/`; larger ones group code into modules under `src/Modules/`. Every module and sub-module follows the same pattern recursively.

## File Structure

```
src/
  index.ts             -- Public entry point (only when exported via package.json)
  Modules/
    <Name>/
      Domain.ts        -- Types, schemas, branded types, domain Context.Service tags
      Service.ts       -- Effect.Service class with business logic
      Errors.ts        -- TaggedError classes
      Config.ts        -- Effect Config + Context.Service for env-driven config (rare)
      Constants.ts     -- Constants and reference data (no logic)
      Helpers.ts       -- Pure utility functions (single file, no Context.Service)
      Helpers/         -- Pure utility functions when one file is not enough
      Toolbox.ts       -- Tool aggregation (if the module exposes tools)
      Tools/           -- Individual tool files (each a Context.Service)
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
| **Domain.ts** | Types, Schema classes, branded types, Context.Service tags for domain concepts, interfaces | Business logic, side effects |
| **Service.ts** | `Effect.Service` class, business logic, the module's primary service | Type-only code |
| **Errors.ts** | `Schema.TaggedError` classes. All names end with `Error` | Business logic |

## Data & Config Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Constants.ts** | Constants and reference data (default names, lookup maps) | Module has reference data with no logic attached |
| **Config.ts** | `Config.all({...})` for env vars + `Context.Service` + `Layer.effect` for defaults | Module has environment-driven configuration. Rare — don't create empty/trivial `Config.ts` files |

## Organization Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Helpers.ts** | Pure utility functions, formatters, transformers (single file) | Module needs a handful of pure helpers that aren't a Context.Service |
| **Helpers/** | Pure utility functions split across files | One `Helpers.ts` outgrows a single file |
| **Modules/** | Sub-modules following the same pattern recursively | A concern within the module needs its own Domain + Service + Errors |

## Tool Files (optional)

| File | Contains | When to use |
|------|----------|-------------|
| **Toolbox.ts** | Aggregates tools from `Tools/` via `Toolbox.make()` | Module exposes tools |
| **Tools/** | One file per tool, each a `Context.Service` using `Tool.make()` | Module has callable tools |

## CLI Files (optional)

CLI packages built on Effect v4's `effect/unstable/cli` reuse this layout with two CLI-specific files. See `domain-cli`.

| File | Contains | When to use |
|------|----------|-------------|
| **Arguments.ts** | `Args.*` and `Options.*` definitions | CLI command takes arguments or flags |
| **Command.ts** | `Command.make(...)` handlers | Module is a CLI command |

## When to Use What

| Concern | Where it goes |
|---------|--------------|
| Only types or schemas | `Domain.ts` |
| Business logic with a Context.Service | `Service.ts` |
| Tagged errors | `Errors.ts` |
| Constants and reference data | `Constants.ts` |
| Environment configuration with defaults | `Config.ts` |
| A few pure functions, no Context.Service | `Helpers.ts` |
| Many pure functions across files | `Helpers/` directory |
| Individual tool definitions | `Tools/` directory |
| Tool aggregation | `Toolbox.ts` |
| CLI args + options | `Arguments.ts` |
| CLI command handlers | `Command.ts` |
| Needs own Domain + Service + Errors | Sub-module in `Modules/` |

## Naming Rules

- Standard files use exact names: `Domain.ts`, `Service.ts`, `Errors.ts`, `Config.ts`, `Constants.ts`, `Helpers.ts`, `Toolbox.ts`, plus CLI `Arguments.ts` and `Command.ts`.
- **Never** use `Registry.ts` or a standalone `State.ts` as a module's primary service — put the primary service logic in `Service.ts`.
- **No loose files** at module root beyond the recognized set or a domain-skill documented exception. Extra files go in `Helpers/`, `Tools/`, or `Modules/`.
- **Do not add `index.ts` barrels.** Import directly from the concrete module file. Keep a package `index.ts` only when `package.json` `exports` points to it.
- PascalCase for all Effect file and directory names.
- Error types always end with `Error` (e.g. `SkillNotFoundError`).

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

**Simple service module:**
```
Config/
  Domain.ts    -- Config types and schemas
  Service.ts   -- Config Context.Service (read, set)
  Errors.ts    -- ConfigKeyNotFoundError
```

**Module with tools:**
```
Tasks/
  Domain.ts    -- TaskInsert, TaskUpdate types
  Service.ts   -- Tasks Effect.Service (CRUD)
  Errors.ts    -- TaskNotFoundError
  Toolbox.ts   -- TasksToolbox
  Tools/
    TaskCreate.ts
    TaskGet.ts
    TaskList.ts
```

**Module with config:**
```
ActivityTracker/
  Service.ts   -- ActivityTracker Effect.Service
  Config.ts    -- ActivityTrackerConfig (env vars with defaults)
```

**CLI command module (`effect/unstable/cli`):**
```
Greet/
  Arguments.ts -- Args + Options definitions
  Command.ts   -- Command handler
  Domain.ts    -- Schemas, errors (optional)
  Service.ts   -- Business logic (optional)
```
