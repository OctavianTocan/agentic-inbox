# Commit Conventions

## Format

Conventional Commits: a type, an optional scope in parens, then an imperative summary.

```
<type>(<scope>): <imperative summary>

<body: why this matters + implementation notes>

<optional references>
```

Drop the scope when no single area applies (`docs: ...`, `feat: ...`).

## Type

Pick the type from the change's intent:

| Type | When |
|------|------|
| `feat` | New behavior or capability |
| `fix` | Bug fix |
| `refactor` | Behavior-preserving restructure |
| `chore` | Tooling, deps, housekeeping (`chore(deps): ...`) |
| `docs` | Documentation only |
| `test` | Tests only |

`perf` and `revert` also appear when they fit.

## Scopes

Scopes are illustrative, not a fixed enum: they mirror the monorepo package and app names, so the scope is usually the directory the change lives in.

| Area | Example scopes |
|------|--------|
| **Apps** | `api`, `app`, `web`, `worker`, `cli` |
| **Packages** | `database`, `auth`, `effect`, `config`, `server`, `ci`, `tooling`, `clients` |
| **Infra** | `infra`, `ci`, `dns` |

Sub-areas are fine when they sharpen the scope: `app(sidebar)`, `ui(markdown)`, `infra(k8s)`.

## Summary Line Rules

- Imperative mood: "add", "fix", "update", "remove" (not "added", "fixes")
- Under 72 characters
- Lowercase after the colon
- No period at end

## Body

Answer these questions (skip if obvious from summary):

1. Why is this change needed?
2. What approach did you take and why?
3. What are the key changes?

Keep it scannable — use bullets for multiple points.

## References

- Link issue trackers when relevant: `Fixes PROJ-123` or `Relates to PROJ-456`
- Don't link for trivial changes

## Execution

Use a heredoc for multi-line messages:

```bash
git commit -m "$(cat <<'EOF'
type(scope): summary line

Body explaining why and how.
EOF
)"
```

Don't use `--no-verify` to skip hooks — fix the issue instead.

## Examples

### Simple fix

```
fix(app): respect mobile breakpoint on sidebar collapse

The sidebar wasn't respecting the mobile breakpoint due to
a missing `md:` prefix on the visibility class.
```

### Feature with context

```
feat(api): add rate limiting for public endpoints

Public API endpoints were vulnerable to abuse. Added sliding
window rate limiting with configurable limits per endpoint.

- Default: 100 requests/minute for authenticated users
- Stricter: 20 requests/minute for anonymous requests
- Uses Redis for distributed state

Relates to PROJ-234
```

### Refactor (no scope)

```
refactor: extract shared validation logic to @shared/app

Validation logic was duplicated across api and worker.
Consolidated into a shared package to ensure consistency
and reduce maintenance burden.

Files moved:
- apps/api/src/validation/* → packages/shared/app/src/validation/*
- apps/worker/src/validation/* → (deleted, now imports from shared)
```

### Dependency update

```
chore(deps): upgrade next.js to 16.1

- Fixes hydration mismatch warnings in development
- Enables new caching behavior (see migration notes)
- Required updating next-config package for new options

https://nextjs.org/blog
```
