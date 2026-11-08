import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { emailDataset } from '../../../src/Modules/Emails/emails.dataset';
import {
  EmailsService,
  EmailsServiceLive
} from '../../../src/Modules/Emails/Service';

const repoRootEmails = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../data/emails.json'
);

describe('EmailsService dataset load', () => {
  it('indexes the static sample inbox from the in-package module', async () => {
    const emails = await Effect.gen(function* () {
      const service = yield* EmailsService;
      return yield* service.list();
    }).pipe(Effect.provide(EmailsServiceLive), Effect.runPromise);

    expect(emails.length).toBe(80);
    expect(emails[0]?.id).toMatch(/^e-\d{3}$/);
  });

  it('keeps emails.dataset.ts in sync with data/emails.json', () => {
    const sot: unknown = JSON.parse(readFileSync(repoRootEmails, 'utf8'));
    expect(Array.isArray(sot)).toBe(true);
    if (!Array.isArray(sot)) {
      throw new Error('expected array');
    }
    expect(sot).toHaveLength(80);
    expect(emailDataset).toHaveLength(80);

    const sotIds = sot.map((row) => {
      if (row === null || typeof row !== 'object' || !('id' in row)) {
        throw new Error('row missing id');
      }
      return String(row.id);
    });
    const moduleIds = emailDataset.map((row) => row.id);
    expect(moduleIds).toEqual(sotIds);
    expect(JSON.parse(JSON.stringify(emailDataset))).toEqual(sot);
  });
});
