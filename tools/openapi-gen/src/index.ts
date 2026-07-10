import { ReferenceApi } from '@contract/api-core';
import { OpenApi } from 'effect/unstable/httpapi';

const outputPath = new URL(
  '../../../packages/api-core/openapi.json',
  import.meta.url
);

/** Serializes a value to stable, sorted JSON for deterministic OpenAPI output. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value), null, 2);
}

/** Recursively sorts object keys for stable JSON serialization. */
function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortJson(nested)])
  );
}

/** Formats a file URL as a repo-relative path for CLI output. */
function formatPath(url: URL): string {
  return url.pathname.replace(`${process.cwd()}/`, '');
}

const main = async (): Promise<void> => {
  const command = process.argv[2];

  if (command !== 'generate' && command !== 'check') {
    console.error(
      'usage: bun run tools/openapi-gen/src/index.ts <generate|check>'
    );
    process.exit(1);
  }

  const spec = OpenApi.fromApi(ReferenceApi);
  const rendered = `${stableStringify(spec)}\n`;

  if (command === 'generate') {
    await Bun.write(outputPath, rendered);
    console.log(`generate: wrote ${formatPath(outputPath)}`);
    process.exit(0);
  }

  const existing = await Bun.file(outputPath)
    .text()
    .catch((error: unknown) => {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === 'ENOENT'
      ) {
        return undefined;
      }

      throw error;
    });

  if (existing === rendered) {
    console.log('check: OpenAPI artifact is up-to-date');
    process.exit(0);
  }

  console.error('check: OpenAPI artifact is out of date');
  console.error('run: bun run openapi:generate');
  process.exit(1);
};

try {
  await main();
} catch (error) {
  console.error(
    'openapi-gen failed:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
