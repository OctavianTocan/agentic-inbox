import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '../../..');
const sourcePath = join(repoRoot, 'data/emails.json');
const outPath = join(scriptDir, '../src/Modules/Emails/emails.dataset.ts');

const raw: unknown = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(raw)) {
  throw new Error('data/emails.json must be a JSON array');
}
if (raw.length !== 80) {
  throw new Error(`expected 80 emails, got ${raw.length}`);
}

const serialized = JSON.stringify(raw, null, 2);
const banner = `/**
 * Generated from repo-root data/emails.json — do not edit by hand.
 * Regenerate: bun run --cwd apps/api sync-emails-dataset
 */
`;

const body = `${banner}export const emailDataset = ${serialized} as const;
`;

writeFileSync(outPath, body, 'utf8');
console.log(`wrote ${outPath} (${raw.length} emails)`);
