#!/usr/bin/env bun

//<workflow-gen>
// name: ci
// required: true
// on:
//   push:
//     branches: [main]
//   pull_request: {}
//   workflow_dispatch: {}
// permissions:
//   contents: read
// concurrency:
//   group: ci-${{ github.ref }}
//   cancel-in-progress: true
// jobs:
//   knip:
//     name: Knip
//     timeout-minutes: 10
//     steps:
//       - uses: actions/checkout@v5
//       - uses: ./.github/actions/setup
//       - name: Run knip
//         run: cd packages/ci/actions/knip && bun run index.ts
//</workflow-gen>

import { execSync, spawnSync } from 'node:child_process';

/** Detect the repository root for running root scripts from a package folder. */
function detectRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel', {
    encoding: 'utf-8',
  }).trim();
}

/** Run the root knip gate and propagate its exit code. */
function main(): void {
  const result = spawnSync('bun', ['run', 'knip'], {
    cwd: detectRepoRoot(),
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

main();
