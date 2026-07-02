# Workflow Stage Taxonomy

Single source of truth for skill stages and their relationships.

## Stages

| Stage | Description |
|-------|-------------|
| `brainstorm` | Ideation, requirements gathering, exploration |
| `plan` | Architecture, design docs, specs, technical planning |
| `build` | Implementation, coding, scaffolding |
| `test` | Testing, QA, validation |
| `review` | Code review, design review, security audits |
| `ship` | Deploy, release, PR creation, versioning |
| `monitor` | Post-deploy observation, canary checks, benchmarks |
| `debug` | Investigation, bug fixing, root cause analysis |

## Adjacency Rules

The primary workflow flows left to right:

```
brainstorm → plan → build → test → review → ship → monitor
```

`debug` connects to multiple stages:
- `debug` ↔ `test` (debugging test failures)
- `debug` ↔ `build` (debugging during implementation)
- `debug` ↔ `monitor` (debugging production issues)

## Connection Types

- **Same stage**: bidirectional (`↔`). Skills that complement each other. Stored in `benefits-from` on both skills.
- **Forward-adjacent stage**: directional (`→`). Skills in the next stage of the linear chain. Stored in `suggests` on the source skill, `benefits-from` on the target skill. Adjacency is forward-only (build→test, never test→build).
- **Debug links**: bidirectional (`↔`). Debug skills connect to build, test, and monitor. Treated as same-stage connections — stored in `benefits-from` on both skills.

## Valid Stage Names

Only these eight values are valid in the `stages` frontmatter field:

```
brainstorm, plan, build, test, review, ship, monitor, debug
```
