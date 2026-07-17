import { Decision } from '@app/api-core/Modules/Triage/Domain';
import { type Context, Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { EmailIdType } from '@/Lib/Ids';
import {
  DecisionsRepo,
  DecisionsRepoBody
} from '@/Modules/Triage/Decisions/Repo';
import { runDb } from '../../support/Database';

type Decisions = Context.Service.Shape<typeof DecisionsRepo>;

const withDecisions = <A, E>(
  use: (repo: Decisions) => Effect.Effect<A, E>
): Promise<A> =>
  runDb(
    Effect.gen(function* () {
      const repo = yield* DecisionsRepo;
      return yield* use(repo);
    }).pipe(Effect.provide(DecisionsRepoBody))
  );

const EMAIL: EmailIdType = 'e-016';

const makeDecision = (overrides?: Partial<Decision>): Decision =>
  new Decision({
    emailId: EMAIL,
    category: 'safety',
    severity: 'critical',
    confidence: 0.92,
    whyPreview: 'Safety incident on site',
    rationale: 'A worker reported a near-miss with the tower crane.',
    keyFacts: ['near-miss', 'tower crane', 'no injuries'],
    isSensitive: true,
    policyReasons: [],
    ...overrides
  });

describe('DecisionsRepo', () => {
  it('persists and reads back a decision with its JSONB key facts', async () => {
    const stored = await withDecisions((repo) =>
      Effect.gen(function* () {
        yield* repo.upsert(makeDecision());
        return yield* repo.get(EMAIL);
      })
    );

    expect(stored).not.toBeNull();
    expect(stored?.category).toBe('safety');
    expect(stored?.confidence).toBeCloseTo(0.92);
    expect(stored?.keyFacts).toEqual([
      'near-miss',
      'tower crane',
      'no injuries'
    ]);
    expect(stored?.isSensitive).toBe(true);
  });

  it('upsert replaces the prior decision for the same email id', async () => {
    const { count, latest } = await withDecisions((repo) =>
      Effect.gen(function* () {
        yield* repo.upsert(makeDecision());
        yield* repo.upsert(
          makeDecision({ severity: 'high', whyPreview: 'Revised assessment' })
        );
        const all = yield* repo.list();
        const latest = yield* repo.get(EMAIL);
        return { count: all.length, latest };
      })
    );

    expect(count).toBe(1);
    expect(latest?.severity).toBe('high');
    expect(latest?.whyPreview).toBe('Revised assessment');
  });

  it('returns null for an untriaged email', async () => {
    const missing = await withDecisions((repo) =>
      repo.get('e-999' as EmailIdType)
    );
    expect(missing).toBeNull();
  });
});
