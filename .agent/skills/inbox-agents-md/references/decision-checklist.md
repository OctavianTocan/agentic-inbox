# Nested AGENTS.md decision checklist

Run before creating or substantially editing a nested subtree file set (`AGENTS.md`, `README.md`, `CLAUDE.md`).

## Create?

Answer yes only if **≥1** is true:

- [ ] Subtree has **different** test/build/dev commands than repo root
- [ ] Subtree uses a **different stack** (Next vs Effect API + Postgres vs generators)
- [ ] Subtree has **stricter safety** (sensitive-email deferral, secrets, generated-artifact policy, migrations)
- [ ] Subtree has **distinct architecture** agents confuse with siblings (api-core vs apps/api vs static emails)
- [ ] `.agent/AGENTS.md` / root `AGENTS.md` would need a **new long section** just for this path

If all unchecked → **do not create**.

## Update?

Answer yes if the PR **persistently** changes documented commands, safety invariants, import/layer boundaries, or first-open reference paths for this subtree.

## Content quality

- [ ] `AGENTS.md` is a **delta**, not a mini-README
- [ ] `README.md` has the goal blockquote and run/commands/entrypoints
- [ ] `CLAUDE.md` exists and contains **only** `@AGENTS.md`
- [ ] No duplicate of root non-negotiables
- [ ] No restatement of Biome/TypeScript rules — cite `bun run lint` / `bun run typecheck`
- [ ] No Contract-only MCP/Turso/CLI rules copied into this repo
- [ ] Root `AGENTS.md` index row added/updated/removed in the same change
