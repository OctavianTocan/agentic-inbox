# Add An Effect Module

## Context

Use to add a domain module to an existing package, or to turn the bundled `Greeter` example into the project's first real module. Activate `domain-effect` — module structure, naming, and signatures are its territory.

## Input

The target package, the module name (PascalCase, e.g. `Notes`), and what the service does.

## Steps

### 1. Copy The Example Module

The bundled `templates/example-package/src/Modules/Greeter/` is a complete, minimal Effect v4 module: `Domain.ts` (Schema types), `Errors.ts` (a `Schema.TaggedErrorClass`), and `Service.ts` (a `Context.Service` with `Effect.fn` methods, a primary `layer`, and a `fakeLayer`). Its test lives at `templates/example-package/test/Greeter/Service.test.ts`.

```bash
cp -R templates/example-package/src/Modules/Greeter <pkg>/src/Modules/<Name>
cp templates/example-package/test/Greeter/Service.test.ts <pkg>/test/<Name>/Service.test.ts
```

### 2. Rename And Reshape

- Rename `Greeter` → `<Name>` throughout (class, identifier, file references, the test).
- Update the service identifier to `@<scope>/<package>/<Name>`.
- Replace `GreetInput`/`Greeting` with the module's real `Schema` domain types in `Domain.ts`.
- Replace `EmptyNameError` with the module's real tagged error(s) in `Errors.ts`. Internal errors carry `cause`; public errors expose only Schema fields. `domain-effect` owns the rules.
- Add the module's exports to the package's `exports` map in `package.json` and its barrel in `src/index.ts`.

### 3. Follow The Effect Conventions

- Methods use `Effect.fn('<Name>.<method>')` for traced boundaries; pure helpers stay plain.
- Build the layer explicitly with `Layer.effect`; wire dependencies with `Layer.provide`. Name the primary layer `layer`.
- Errors are values in the error channel — never `throw` across a boundary.
- Never guess a signature: read `vendor/effect-smol` or copy from the example.

### 4. Test Through The Public Surface

Keep the `@effect/vitest` `it.effect` shape from the example test: provide `layer` (or `fakeLayer`), exercise the service, assert on results, and use `Effect.flip` to assert on tagged errors. Tests live in the package's `test/` directory.

## Done

Report the module path, its service identifier, the error types, and that `bun run typecheck` and the module's tests pass.
