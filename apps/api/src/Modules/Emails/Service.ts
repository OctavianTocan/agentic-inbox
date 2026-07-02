import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  type Email,
  EmailFromDataset
} from '@app/api-core/Modules/Emails/Domain';
import { Context, Effect, Layer, Schema } from 'effect';
import type { EmailIdType } from '@/Lib/Ids';

const DATASET_PATH = fileURLToPath(
  new URL('../../../../../data/emails.json', import.meta.url)
);

const decodeDataset = Schema.decodeUnknownSync(Schema.Array(EmailFromDataset));

/** Builds a map from each email's reply-target to the emails replying to it. */
const buildThreadMap = (
  emails: ReadonlyArray<Email>
): ReadonlyMap<EmailIdType, ReadonlyArray<Email>> => {
  const map = new Map<EmailIdType, Email[]>();
  for (const email of emails) {
    if (email.inReplyTo === null) {
      continue;
    }
    const replies = map.get(email.inReplyTo) ?? [];
    replies.push(email);
    map.set(email.inReplyTo, replies);
  }
  return map;
};

/** In-memory access to the static 80-email dataset, indexed by id with a reply thread map. */
export class EmailsService extends Context.Service<
  EmailsService,
  {
    readonly list: () => Effect.Effect<ReadonlyArray<Email>>;
    readonly get: (id: EmailIdType) => Effect.Effect<Email | null>;
    readonly thread: (id: EmailIdType) => Effect.Effect<ReadonlyArray<Email>>;
  }
>()('@apps/api/Emails/EmailsService') {}

/** Loads and indexes the dataset once at layer construction. */
export const EmailsServiceLive: Layer.Layer<EmailsService> = Layer.effect(
  EmailsService,
  Effect.gen(function* () {
    const raw = yield* Effect.sync(() =>
      JSON.parse(readFileSync(DATASET_PATH, 'utf8'))
    );
    const emails = decodeDataset(raw);
    const byId = new Map(emails.map((email) => [email.id, email] as const));
    const threads = buildThreadMap(emails);

    const list = Effect.fn('EmailsService.list')(() => Effect.succeed(emails));

    const get = Effect.fn('EmailsService.get')((id: EmailIdType) =>
      Effect.succeed(byId.get(id) ?? null)
    );

    const collectThread = (id: EmailIdType): ReadonlyArray<Email> => {
      const root = byId.get(id);
      if (root === undefined) {
        return [];
      }
      const ordered: Email[] = [root];
      const walk = (parentId: EmailIdType): void => {
        for (const reply of threads.get(parentId) ?? []) {
          ordered.push(reply);
          walk(reply.id);
        }
      };
      walk(id);
      return ordered;
    };

    const thread = Effect.fn('EmailsService.thread')((id: EmailIdType) =>
      Effect.succeed(collectThread(id))
    );

    return { list, get, thread } as const;
  })
);
