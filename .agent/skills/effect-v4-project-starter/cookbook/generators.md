# Add Source-Driven Generators

## Context

Use when project docs, skills, or GitHub workflows should stay close to the source code they describe. This pattern is useful for agent tooling repos where stale skills and stale CI are more dangerous than a small generator.

## Input

The project root and the artifact types to generate: skills, workflows, or both.

## Steps

### 1. Decide If Generation Is Worth It

Use `skill-gen` when:

- skill content describes specific source modules
- maintainers need the guidance to move with code
- there will be multiple fragments for one skill
- CI should catch stale generated skills

Use `workflow-gen` when:

- packages/actions should own their own workflow jobs
- required checks should be generated from workflow metadata
- CI fragments would otherwise drift from source

Do not add generators for one static file that rarely changes.

### 2. Add Generator Packages

Follow the reference pattern:

```text
packages/
  ci/
    skill-gen/
      src/
      SPEC.md
    workflow-gen/
      src/
      SPEC.md
```

The generators are normal Bun + Effect v4 CLI packages. They should use:

- `#!/usr/bin/env bun`
- `effect/unstable/cli`
- `@effect/platform-bun`
- `BunRuntime.runMain`
- `BunServices.layer`

### 3. Add Root Scripts

Add scripts like:

```json
{
  "scripts": {
    "skill-gen:generate": "bun run packages/ci/skill-gen/src/index.ts generate",
    "skill-gen:check": "bun run packages/ci/skill-gen/src/index.ts check",
    "workflow-gen:generate": "bun run packages/ci/workflow-gen/src/index.ts generate",
    "workflow-gen:check": "bun run packages/ci/workflow-gen/src/index.ts check"
  }
}
```

Include the check commands in `ci`.

### 4. Author Skill Fragments

Embed fragments near the code they teach:

```ts
//<skill-gen>
// ---
// name: my-toolkit
// description: "Use when maintaining the my-tool package or integrating its CLI/API."
// ---
//
// # My Toolkit
//
// This package owns ...
//</skill-gen>
```

Generated skill files are written to `.agents/skills/<name>/SKILL.md`. Do not hand-edit generated `SKILL.md` files.

### 5. Author Workflow Fragments

Embed workflow fragments near the package/action that owns the job:

```ts
//<workflow-gen>
// name: ci
// required: true
// on:
//   pull_request: {}
// jobs:
//   typecheck:
//     name: Typecheck
//     steps:
//       - uses: actions/checkout@v5
//       - uses: ./.github/actions/setup
//       - run: bun run typecheck
//</workflow-gen>
```

Generated workflows go to `.github/workflows/`, and required job names go to `required-workflows.json`.

### 6. Protect Hand-Written Files

Generators must refuse to overwrite hand-written files unless those files carry the generator header. This prevents accidental replacement of carefully authored skills or workflows.

### 7. Verify Drift

Run:

```bash
bun run skill-gen:generate
bun run skill-gen:check
bun run workflow-gen:generate
bun run workflow-gen:check
```

Inspect generated diffs before committing.

## Done

Report added generator packages, root scripts, generated files, and CI drift checks.
