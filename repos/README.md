# Vendored repositories

This project vendors external library source under `repos/` as **git subtrees**, following [Effect’s agent guidance](https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/). Agents explore real source instead of guessing from docs or `node_modules`.

## Rules (for agents and humans)

- Use `repos/` as **read-only reference material** when working with related libraries.
- Prefer examples and patterns from the vendored source over generated guesses or web search.
- **Do not edit** files under `repos/` unless explicitly asked.
- **Do not import** from `repos/` — application code continues to use normal package dependencies (`effect`, `@effect/*` from the workspace catalog).

## Contents

| Path | Upstream | Purpose |
|------|----------|---------|
| [`effect-smol/`](./effect-smol/) | [Effect-TS/effect-smol](https://github.com/Effect-TS/effect-smol) | Effect v4 source of truth for this repo |

### Effect (`repos/effect-smol`)

When writing Effect code:

1. **Always start with** [`effect-smol/LLMS.md`](./effect-smol/LLMS.md) (Effect’s agent-oriented guide).
2. Then use package docs and source under `effect-smol/packages/effect/` (for example `HTTPAPI.md`, `CONFIG.md`, and `src/`).
3. Prefer project distillations in [`docs/agent-patterns/`](../docs/agent-patterns/) once they exist for a topic.

Treat `repos/effect-smol` as the source of truth for Effect patterns — not `node_modules`.

## Editor

`repos/**` is excluded from VS Code search, file watching, and auto-import suggestions so humans are not flooded with external symbols. Agents can still read the tree on disk.

## Updating

```bash
git subtree pull \
  --prefix=repos/effect-smol \
  https://github.com/Effect-TS/effect-smol.git \
  main \
  --squash
```
