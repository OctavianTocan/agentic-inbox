#!/usr/bin/env bun

//<gen-skill>
// ---
// name: gen-github-workflow
// description: "Use when creating, modifying, generating, checking, or debugging CI workflow fragments embedded in source code with //<gen-github-workflow> markers."
// ---
//
// # gen-github-workflow
//
// Scans source files for `//<gen-github-workflow>` markers, extracts YAML fragments, deep-merges them by workflow name, and writes `.github/workflows/<name>.yml` files.
//
// **Full specification:** `SPEC.md`
//
// ## How to Create a CI Workflow
//
// Embed a workflow fragment in any source file using comment markers:
//
// ```ts
// //<gen-github-workflow>
// // name: my-workflow
// // required: true
// // on:
// //   push:
// //     branches: [main]
// //   pull_request: {}
// // permissions:
// //   contents: read
// // concurrency:
// //   group: my-workflow-${{ github.ref }}
// //   cancel-in-progress: true
// // jobs:
// //   build:
// //     name: Build
// //     timeout-minutes: 10
// //     steps:
// //       - uses: actions/checkout@v5
// //       - uses: ./.github/actions/setup
// //       - name: Build
// //         run: bun run build
// //</gen-github-workflow>
// ```
//
// ### Top-Level Fields
//
// | Field | Purpose |
// |-------|---------|
// | `name` | **Required.** Determines the output filename and merge key. |
// | `required` | If `true`, added to `required-workflows.json`. Stripped from output YAML. |
// | `on` | GitHub Actions trigger configuration. |
//
// ### Template Variables
//
// Expanded before YAML parsing:
//
// | Variable | Expands to |
// |----------|------------|
// | `\$$file` | Relative path from repo root to the source file |
// | `\$$directory` | Relative path from repo root to the source file's directory |
//
// Useful for `paths:` triggers:
//
// ```ts
// //<gen-github-workflow>
// // name: e2e-test-my-tool
// // on:
// //   push:
// //     paths: ["\$$directory/**"]
// //   pull_request:
// //     paths: ["\$$directory/**"]
// //</gen-github-workflow>
// ```
//
// ### Multi-Source Merging
//
// Fragments sharing the same `name` are deep-merged:
//
// | Key | Strategy |
// |-----|----------|
// | `on` | Union of trigger definitions |
// | `env`, `permissions` | Shallow merge, later wins |
// | `concurrency` | Last writer wins |
// | `jobs` | Merge by job id; `steps` arrays concatenated |
//
// ### Common Patterns
//
// **Bun-based CI action** (used by lint and typecheck):
// ```ts
// //<gen-github-workflow>
// // name: my-check
// // required: true
// // on:
// //   push:
// //     branches: [main, develop]
// //   pull_request: {}
// // jobs:
// //   check:
// //     steps:
// //       - uses: actions/checkout@v5
// //       - uses: ./.github/actions/setup
// //       - run: cd \$$directory && bun run src/index.ts
// //</gen-github-workflow>
// ```
//
// ## CLI Commands
//
// ```bash
// bun run src/index.ts generate  # write workflow files
// bun run src/index.ts check     # dry-run, exit 1 on diff
// bun run src/index.ts e2e-test  # run against fixtures
// ```
//
// After editing fragments, run `generate` and commit the regenerated `.github/workflows/*.yml`. Workflows with `required: true` also write to `required-workflows.json` (used by branch protection IaC). Hand-written workflow files without the `AUTO-GENERATED` header are never overwritten.
//
// Tooling shape (markers, comment stripping, source headers, hand-written file detection) mirrors the `gen-skills` skill. See `gen-skills` for that shared workflow.
//</gen-skill>

//<gen-github-workflow>
// name: check-generated-workflows
// required: true
// on:
//   push:
//     branches: [main]
//   pull_request: {}
// permissions:
//   contents: read
// concurrency:
//   group: check-generated-workflows-${{ github.ref }}
//   cancel-in-progress: true
// jobs:
//   check:
//     name: Check generated workflows are up-to-date
//     timeout-minutes: 10
//     steps:
//       - uses: actions/checkout@v5
//       - uses: oven-sh/setup-bun@v2
//       - name: Install dependencies
//         run: bun install --frozen-lockfile
//       - name: Check workflows are up-to-date
//         run: bun run src/index.ts check
//</gen-github-workflow>

//<gen-github-workflow>
// name: e2e-test-gen-github-workflow
// on:
//   push:
//     branches: [main]
//     paths:
//       - "$$directory/**"
//       - "e2e-test/**"
//       - "e2e-test-expected/**"
//   pull_request:
//     paths:
//       - "$$directory/**"
//       - "e2e-test/**"
//       - "e2e-test-expected/**"
// permissions:
//   contents: read
// concurrency:
//   group: e2e-test-gen-github-workflow-${{ github.ref }}
//   cancel-in-progress: true
// jobs:
//   e2e-test:
//     name: E2E test gen-github-workflow
//     timeout-minutes: 10
//     steps:
//       - uses: actions/checkout@v5
//       - uses: oven-sh/setup-bun@v2
//       - name: Install dependencies
//         run: bun install --frozen-lockfile
//       - name: Typecheck
//         run: bun run typecheck
//       - name: Run e2e tests
//         run: bun run src/index.ts e2e-test
//</gen-github-workflow>

/**
 * gen-github-workflow
 *
 * Scans source files for //<gen-github-workflow\> markers, extracts YAML
 * fragments, merges them by workflow name, and writes complete GitHub
 * Actions workflow files.
 *
 * See SPEC.md for full details.
 */

import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { mergeFragments } from './merge';
import {
  checkRequiredWorkflows,
  checkWorkflows,
  collectRequired,
  formatDiffs,
  validateRequired,
  writeRequiredWorkflows,
  writeWorkflows
} from './output';
import { parseFragment } from './parse';
import { scan } from './scan';

const args = process.argv.slice(2);
const command = args[0];

/** Read the value following a named CLI flag, or undefined if absent. */
function getOption(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) {
    return;
  }
  return args[idx + 1];
}

const verbose = args.includes('--verbose');

if (command === '--help' || command === 'help') {
  // biome-ignore lint/suspicious/noConsole: CLI output
  console.log(`Usage: gen-github-workflow <command> [options]

Commands:
  generate           Scan, merge, and write workflow files (default command)
  check              Dry-run: exit 1 if generated output differs from existing files
  e2e-test           Run e2e tests against fixtures

Options:
  --base <path>      Base folder to scan (default: repo root, detected via git)
  --output <path>    Output folder for generated workflows (default: <base>/.github/workflows)
  --verbose          Print discovered fragments and merge diagnostics
  --help             Show help`);
  process.exit(0);
}

/**
 * Detect git repo root, falling back to cwd.
 */
function detectRepoRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8'
    }).trim();
  } catch {
    return process.cwd();
  }
}

/** Build the validated, merged workflow map for fragments under a base folder. */
async function runPipeline(baseDir: string, outputDir: string) {
  const rawFragments = await scan(baseDir, outputDir, verbose);

  if (verbose) {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.log(`pipeline: found ${rawFragments.length} raw fragment(s)`);
  }

  const parsed = rawFragments.map(parseFragment);
  const merged = mergeFragments(parsed, verbose);
  validateRequired(merged);

  if (verbose) {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.log(`pipeline: merged into ${merged.size} workflow(s)`);
  }

  return merged;
}

/**
 * Compare two strings, normalizing JSON whitespace for .json files
 * (biome may reformat arrays based on line width).
 */
function contentsMatch(
  file: string,
  actual: string,
  expected: string
): boolean {
  if (actual === expected) {
    return true;
  }
  if (!file.endsWith('.json')) {
    return false;
  }
  try {
    return (
      JSON.stringify(JSON.parse(actual)) ===
      JSON.stringify(JSON.parse(expected))
    );
  } catch {
    return false;
  }
}

/** Compare one generated file against its expected fixture, logging diffs. */
async function compareFile(
  file: string,
  expectedDir: string,
  tmpOutput: string
): Promise<boolean> {
  const expectedContent = await readFile(resolve(expectedDir, file), 'utf-8');
  const actualPath = resolve(tmpOutput, file);

  let actualContent: string;
  try {
    actualContent = await readFile(actualPath, 'utf-8');
  } catch {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.error(`FAIL: expected file ${file} not found in output`);
    return false;
  }

  if (!contentsMatch(file, actualContent, expectedContent)) {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.error(`FAIL: ${file} content mismatch`);
    const expLines = expectedContent.split('\n');
    const actLines = actualContent.split('\n');
    const maxLen = Math.max(expLines.length, actLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (expLines[i] !== actLines[i]) {
        if (actLines[i] !== undefined) {
          // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
          console.error(`  - ${actLines[i]}`);
        }
        if (expLines[i] !== undefined) {
          // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
          console.error(`  + ${expLines[i]}`);
        }
      }
    }
    return false;
  }

  return true;
}

if (command === 'e2e-test') {
  const projectDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
  const testDir = resolve(projectDir, 'e2e-test');
  const expectedDir = resolve(projectDir, 'e2e-test-expected');
  const tmpOutput = mkdtempSync(resolve(tmpdir(), 'gen-github-workflow-e2e-'));

  if (verbose) {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.log(`e2e-test: scanning ${testDir}`);
  }

  try {
    const merged = await runPipeline(testDir, tmpOutput);
    await writeWorkflows(merged, tmpOutput, verbose);

    const requiredChecks = collectRequired(merged);
    await writeRequiredWorkflows(requiredChecks, tmpOutput, verbose);

    const expectedFiles = await readdir(expectedDir);
    const actualFiles = await readdir(tmpOutput);

    const compareFiles = expectedFiles.filter(
      (f) => f.endsWith('.yml') || f === 'required-workflows.json'
    );
    const results = await Promise.all(
      compareFiles.map((file) => compareFile(file, expectedDir, tmpOutput))
    );
    let hasError = results.some((ok) => !ok);

    for (const file of actualFiles) {
      if (!(file.endsWith('.yml') || file === 'required-workflows.json')) {
        continue;
      }
      if (!expectedFiles.includes(file)) {
        // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
        console.error(`FAIL: unexpected file ${file} in output`);
        hasError = true;
      }
    }

    if (hasError) {
      // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
      console.error('e2e-test: FAILED');
      process.exit(1);
    }
  } finally {
    rmSync(tmpOutput, { recursive: true, force: true });
  }

  // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
  console.log('e2e-test: PASSED');
  process.exit(0);
}

if (command === 'check') {
  const baseDir = getOption('--base') ?? detectRepoRoot();
  const outputDir =
    getOption('--output') ?? resolve(baseDir, '.github', 'workflows');

  const merged = await runPipeline(baseDir, outputDir);
  const diffs = await checkWorkflows(merged, outputDir);

  const requiredChecks = collectRequired(merged);
  const requiredDiff = await checkRequiredWorkflows(requiredChecks, baseDir);
  if (requiredDiff) {
    diffs.push(requiredDiff);
  }

  if (diffs.length === 0) {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.log('check: all workflows are up-to-date');
    process.exit(0);
  }

  // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
  console.error(`check: ${diffs.length} difference(s) found`);
  // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
  console.error(formatDiffs(diffs));
  process.exit(1);
}

if (!command || command === 'generate') {
  const baseDir = getOption('--base') ?? detectRepoRoot();
  const outputDir =
    getOption('--output') ?? resolve(baseDir, '.github', 'workflows');

  const merged = await runPipeline(baseDir, outputDir);
  await writeWorkflows(merged, outputDir, verbose);

  const requiredChecks = collectRequired(merged);
  await writeRequiredWorkflows(requiredChecks, baseDir, verbose);

  // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
  console.log(`generate: wrote ${merged.size} workflow(s) to ${outputDir}`);
  process.exit(0);
}

// biome-ignore lint/suspicious/noConsole: CLI diagnostic output
console.error(`Unknown command: ${command}. Run with --help for usage.`);
process.exit(1);
