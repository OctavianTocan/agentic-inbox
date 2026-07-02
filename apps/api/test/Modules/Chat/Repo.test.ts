import { type Context, Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { ConversationsRepo, ConversationsRepoBody } from '@/Modules/Chat/Repo';
import { runDb } from '../../support/Database';

type Conversations = Context.Service.Shape<typeof ConversationsRepo>;

const withConversations = <A, E>(
  use: (repo: Conversations) => Effect.Effect<A, E>
): Promise<A> =>
  runDb(
    Effect.gen(function* () {
      const repo = yield* ConversationsRepo;
      return yield* use(repo);
    }).pipe(Effect.provide(ConversationsRepoBody))
  );

describe('ConversationsRepo', () => {
  it('round-trips the JSONB prompt and pending approval', async () => {
    const prompt = [{ role: 'user', content: 'what needs my attention?' }];
    const pending = { approvalId: 'apr-1', toolCallId: 'call-1' };

    const stored = await withConversations((repo) =>
      Effect.gen(function* () {
        const saved = yield* repo.save({
          status: 'paused',
          prompt,
          pending,
          emailId: null
        });
        return yield* repo.get(saved.id);
      })
    );

    expect(stored?.status).toBe('paused');
    expect(stored?.prompt).toEqual(prompt);
    expect(stored?.pending).toEqual(pending);
  });

  it('save with a known id upserts rather than duplicating', async () => {
    const result = await withConversations((repo) =>
      Effect.gen(function* () {
        const first = yield* repo.save({ status: 'active', prompt: [] });
        const updated = yield* repo.save({
          id: first.id,
          status: 'complete',
          prompt: [{ role: 'assistant', content: 'done' }]
        });
        const paused = yield* repo.listPaused();
        return { first, updated, pausedCount: paused.length };
      })
    );

    expect(result.updated.id).toBe(result.first.id);
    expect(result.updated.status).toBe('complete');
    expect(result.pausedCount).toBe(0);
  });

  it('listPaused returns only paused conversations', async () => {
    const paused = await withConversations((repo) =>
      Effect.gen(function* () {
        yield* repo.save({ status: 'active', prompt: [] });
        yield* repo.save({ status: 'paused', prompt: [] });
        yield* repo.save({ status: 'complete', prompt: [] });
        return yield* repo.listPaused();
      })
    );

    expect(paused).toHaveLength(1);
    expect(paused[0]?.status).toBe('paused');
  });
});
