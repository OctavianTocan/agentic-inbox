# Chat Tool Blocks

How tool-block UI components are organised, registered, and memoized inside `@comcom/app-core`.

## File Layout

Tool blocks live under `packages/comcom/app-core/src/features/chat/tool-blocks/`. The default layout is **flat**: one file per block, named so the suffix telegraphs what it is.

```
tool-blocks/
├── file/
│   ├── glob-tool-block.tsx              ← single-file block (default)
│   ├── grep-tool-block.tsx
│   ├── read-file-tool-block.tsx
│   └── (no in-domain helpers needed)
├── gmail/
│   ├── list-labels-tool-block.tsx       ← single-file block
│   ├── search-messages-tool-block.tsx
│   └── shared/                          ← per-domain helpers (label-chip, types, use-gmail-tool-part)
├── github/
│   ├── github-list-pull-requests-tool-block.tsx
│   └── shared/                          ← github-types.ts, stable-key.ts, github-row.tsx
└── shared/                              ← cross-domain primitives
    ├── tool-error-boundary.tsx
    ├── tool-block.tsx
    ├── format/                          ← multi-file helper folder (build-unified-diff, extract-domain, …)
    └── …
```

- **Default — single file:** `<domain>/<name>-tool-block.tsx`. The `-tool-block.tsx` suffix signals "this is a chat tool-block module".
- **Only when a block has multiple files:** use a folder `<domain>/<name>/` containing `<name>-tool-block.tsx` (the main component) + sibling helpers + a lowercase `index.ts` barrel re-exporting the tool block.
- **Domain-level `shared/` folders** are separate from per-block folders — they hold cross-block helpers within a domain and remain regardless of how individual blocks are organised.

File names are kebab-case; the React component inside stays PascalCase (`GlobToolBlock`, `GitHubListPullRequestsToolBlock`).

## The `defineToolBlock` Factory

Every tool-block module named-exports a `toolBlock` constant through the factory at `packages/comcom/app-core/src/features/chat/tool-blocks/define-tool-block.ts`:

```tsx
'use client';

import { defineToolBlock } from '../define-tool-block';

function GlobToolBlock() {
  // body uses usePart() / useToolPart() — no props
}

export const toolBlock = defineToolBlock({
  name: 'tool-Glob',
  component: GlobToolBlock,
});
```

The factory takes `{ name: ToolBlockKey, component: ComponentType }` where `ToolBlockKey` is `` `tool-${keyof AppTools}` ``. Typos and stale entries surface as compile errors at the call site. `defineToolBlock` is identity at runtime — no closures, no per-block memo. The `'use client'` directive stays in every tool-block module because every block uses hooks.

Tool-block modules use a **named** export (`export const toolBlock = …`), matching the `no-app-core-default-exports` repo policy. Default exports are reserved for Next.js pages/layouts.

## Central Registry

`packages/comcom/app-core/src/features/chat/chat-component-registry.ts` is an **explicit** import list. Every tool-block module is named, one import per line, one entry per line in a static map keyed by `name`. Auto-discovery (`import.meta.glob`) is rejected: the registry must be greppable, the import graph must be statically obvious, and adding a tool block is a deliberate two-line edit, not a side effect of dropping a file.

Shape:

```ts
import { toolBlock as Glob } from './tool-blocks/file/glob-tool-block';
import { toolBlock as Grep } from './tool-blocks/file/grep-tool-block';
import { toolBlock as GitHubListPullRequests } from './tool-blocks/github/github-list-pull-requests-tool-block';
// … one import per block

const toolBlockModules: readonly ToolBlockModule[] = [
  Glob,
  Grep,
  GitHubListPullRequests,
  // … one entry per block
];

const toolBlocks: Record<string, ComponentType> = {};
for (const module of toolBlockModules) {
  toolBlocks[module.name] = withToolBoundary(module.component);
}
```

The registry never re-exports through intermediate aggregator files. Per-domain `entries.ts` files are forbidden.

## Memoization at the Registry

`React.memo` is applied **once**, at the registry layer, inside `withToolBoundary` (`packages/comcom/app-core/src/features/chat/tool-blocks/shared/tool-error-boundary.tsx`). Tool-block components have no props in practice (`<PartComponent />` at the call site passes none), so the default shallow-prop equality is trivially `true` and memo short-circuits unless the boundary unmounts. Per-block inner `useMemo` calls are dead optimizations and are dropped.

Module-level JSX constants for static icon props (e.g. `const fileListLeadingIcon = <FileBrandIcon className="size-3 shrink-0" />`) stay — react-doctor flags inline JSX literals as new element creations per render, and hoisting them to module scope is the canonical fix.

## Static-Completeness Test

Drift between the registry and the tool union is caught by a Vitest assertion:

```ts
expect(Object.keys(toolBlocks).sort()).toEqual(
  toolBlockKeys.sort()
);
```

Every test run becomes a completeness check. A tool added to `AppTools` without a registry entry, or a registry entry whose `name` doesn't match any `AppTools` key, fails the test.

## Adding a Tool Block

1. Create `tool-blocks/{domain}/{tool-name-kebab}-tool-block.tsx` with `'use client'`, the component, and a `defineToolBlock({ name, component })` named export (`export const toolBlock = …`).
2. Add one `import { toolBlock as Name } from './tool-blocks/{domain}/{tool-name-kebab}-tool-block'` line and one entry to the `toolBlockModules` array in `chat-component-registry.ts`.
3. The static-completeness test passes once both edits are in.

If a block grows multiple files (helpers, sub-components, large fixtures), promote it to a folder: move `<name>-tool-block.tsx` into `<name>/`, add sibling files, and add an `index.ts` barrel re-exporting `toolBlock`. The registry import path stays `./tool-blocks/{domain}/{tool-name-kebab}` (folders resolve via the barrel).
