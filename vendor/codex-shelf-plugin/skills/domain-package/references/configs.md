# Config Templates and Inheritance

Canonical `package.json` and `tsconfig.json` shapes for each package archetype, plus the tsconfig inheritance chain. Pair this with [SKILL.md](../SKILL.md) when scaffolding a new package.

## tsconfig Inheritance Chain

```
packages/tooling/typescript-config/
  base.json    ES2023 / ESNext / Bundler, strict, paths @/* and @test/* via ${configDir}
  └── bun.json extends base; types: ["bun"], noEmit — for Bun-runtime packages and CLIs
```

These are the only two bases. A plain library extends `base.json`; anything that runs on Bun (services, CLIs, anything using Bun globals) extends `bun.json`.

## Effect Library Package

```json
// package.json
{
  "name": "@scope/my-lib",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts", "./*": "./src/*" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": { "effect": "catalog:" },
  "devDependencies": {
    "@tooling/typescript-config": "workspace:*",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

```json
// tsconfig.json
{
  "extends": "@tooling/typescript-config/base.json",
  "compilerOptions": { "paths": { /* scoped aliases if needed */ } },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Bun Service / CLI

Same `package.json` shape as the Effect library (add `@effect/platform-bun` and `@types/bun` from `catalog:` for a Bun CLI), but extend `bun.json` in tsconfig — that's what sets `types: ["bun"]` and `noEmit`. Effect v4 CLI modules come from `effect/unstable/cli`:

```json
// tsconfig.json
{
  "extends": "@tooling/typescript-config/bun.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"], "@test/*": ["./test/*"] }
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```
