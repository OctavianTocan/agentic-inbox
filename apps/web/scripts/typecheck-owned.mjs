import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const externalPrefixes = ['src/ai-ui/', '../api/'];
const diagnosticPattern = /^(.+?)\(\d+,\d+\): error TS\d+:/;

const result = spawnSync('bunx', ['tsc', '--noEmit', '--pretty', 'false'], {
  cwd: appRoot,
  encoding: 'utf8'
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trimEnd();

if (result.status === 0) {
  process.exit(0);
}

const ownedDiagnostics = diagnosticBlocks(output).filter(isOwnedDiagnostic);

if (ownedDiagnostics.length > 0) {
  console.error(ownedDiagnostics.map((block) => block.join('\n')).join('\n'));
  process.exit(result.status ?? 1);
}

console.log(
  'Web typecheck passed for owned source; external template diagnostics are excluded: src/ai-ui, ../api.'
);

/**
 * Group TypeScript diagnostic text by the source file that starts each error.
 *
 * @param outputText - Plain `tsc --pretty false` output.
 * @returns Diagnostic blocks keyed by their first source line.
 */
function diagnosticBlocks(outputText) {
  const blocks = [];
  let current = [];

  for (const line of outputText.split(/\r?\n/)) {
    if (diagnosticPattern.test(line)) {
      if (current.length > 0) {
        blocks.push(current);
      }
      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

/**
 * Whether a diagnostic belongs to first-party app code rather than templates.
 *
 * @param block - Diagnostic block beginning with a TypeScript source line.
 * @returns True when the source path is owned by this app.
 */
function isOwnedDiagnostic(block) {
  const match = diagnosticPattern.exec(block[0] ?? '');
  if (match === null) {
    return true;
  }
  const sourcePath = match[1];
  return !externalPrefixes.some((prefix) => sourcePath.startsWith(prefix));
}
