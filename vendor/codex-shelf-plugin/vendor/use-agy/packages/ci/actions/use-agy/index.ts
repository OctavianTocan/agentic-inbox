#!/usr/bin/env bun

//<workflow-gen>
// name: use-agy
// required: true
// on:
//   push:
//     branches: [main]
//   pull_request: {}
//   workflow_dispatch: {}
// permissions:
//   contents: read
// concurrency:
//   group: use-agy-${{ github.ref }}
//   cancel-in-progress: true
// jobs:
//   use-agy:
//     name: Use Agy
//     timeout-minutes: 10
//     steps:
//       - uses: actions/checkout@v5
//       - uses: ./.github/actions/setup
//       - name: Run use-agy typechecks
//         run: |
//           bun run --filter "@use-agy/*" typecheck
//           bun run --filter "@agent-dev/use-agy" typecheck
//           bun run --filter "@apps/use-agy-api" typecheck
//       - name: Run use-agy tests
//         run: |
//           bun run --filter "@use-agy/*" test
//           bun run --filter "@agent-dev/use-agy" test
//           bun run --filter "@apps/use-agy-api" test
//       - name: Check generated artifacts
//         run: |
//           bun run skill-gen:check
//           bun run workflow-gen:check
//</workflow-gen>

import { execSync, spawnSync } from 'node:child_process';

/**
 * Detects the repository root for local action execution.
 *
 * @returns Absolute repository root path.
 */
function detectRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel', {
    encoding: 'utf-8',
  }).trim();
}

/**
 * Runs a Bun command from the repository root and exits on failure.
 *
 * @param args - Arguments passed to the `bun` executable.
 */
function run(args: ReadonlyArray<string>): void {
  const result = spawnSync('bun', args, {
    cwd: detectRepoRoot(),
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(['run', '--filter', '@use-agy/*', 'typecheck']);
run(['run', '--filter', '@agent-dev/use-agy', 'typecheck']);
run(['run', '--filter', '@apps/use-agy-api', 'typecheck']);
run(['run', '--filter', '@use-agy/*', 'test']);
run(['run', '--filter', '@agent-dev/use-agy', 'test']);
run(['run', '--filter', '@apps/use-agy-api', 'test']);
run(['run', 'skill-gen:check']);
run(['run', 'workflow-gen:check']);
