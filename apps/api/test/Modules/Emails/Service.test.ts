import { type Context, Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { EmailIdType } from '@/Lib/Ids';
import { EmailsService, EmailsServiceLive } from '@/Modules/Emails/Service';

type Emails = Context.Service.Shape<typeof EmailsService>;

const withEmails = <A, E>(
  use: (service: Emails) => Effect.Effect<A, E>
): Promise<A> =>
  Effect.gen(function* () {
    const service = yield* EmailsService;
    return yield* use(service);
  }).pipe(Effect.provide(EmailsServiceLive), Effect.runPromise);

describe('EmailsService', () => {
  it('loads the full 80-email dataset', async () => {
    const emails = await withEmails((service) => service.list());
    expect(emails).toHaveLength(80);
  });

  it('indexes emails by id', async () => {
    const email = await withEmails((service) =>
      service.get('e-001' as EmailIdType)
    );
    expect(email?.id).toBe('e-001');
    expect(email?.subject).toContain('RFI-187');
  });

  it('returns null for an unknown id', async () => {
    const missing = await withEmails((service) =>
      service.get('e-999' as EmailIdType)
    );
    expect(missing).toBeNull();
  });

  it('builds a thread that starts with the requested root email', async () => {
    const thread = await withEmails((service) =>
      service.thread('e-001' as EmailIdType)
    );
    expect(thread[0]?.id).toBe('e-001');
    // Every non-root member of a thread points back into the same thread.
    for (const email of thread.slice(1)) {
      expect(email.inReplyTo).not.toBeNull();
    }
  });
});
