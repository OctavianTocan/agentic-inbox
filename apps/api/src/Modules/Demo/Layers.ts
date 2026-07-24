import { Api, SchemaErrorHandlerLive } from '@app/api-core';
import type { LedgerEntry } from '@app/api-core/Modules/Actions/Domain';
import {
  ActionNotFound,
  ApprovalNotFound
} from '@app/api-core/Modules/Actions/Errors';
import { EmailNotFound } from '@app/api-core/Modules/Emails/Errors';
import { TriageRunDone } from '@app/api-core/Modules/Triage/Events';
import { Effect, Layer, Stream } from 'effect';
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi';
import { HttpActionsLive } from '@/Modules/Actions/Http';
import { LedgerService } from '@/Modules/Actions/Service';
import { ChatAgent } from '@/Modules/Agent/ChatAgent';
import { HttpChatLive } from '@/Modules/Chat/Http';
import { HttpSystemLive } from '@/Modules/System/Http';
import { HttpTriageLive } from '@/Modules/Triage/Http';
import { InboxOrchestrator } from '@/Modules/Triage/Service';
import { DemoInbox } from './DemoInbox';

const DEMO_UNAVAILABLE = 'Not available in demo mode';

const demoLedger: ReadonlyArray<LedgerEntry> = DemoInbox.items.flatMap(
  (item) => item.actions
);

/** Read-only inbox orchestrator backed by the seeded showcase inbox. */
const DemoInboxOrchestratorLive = Layer.succeed(InboxOrchestrator, {
  run: () =>
    Effect.succeed(
      Stream.succeed(
        new TriageRunDone({
          type: 'done',
          processed: 0
        })
      )
    ),
  retriage: (emailId) => Effect.fail(new EmailNotFound({ emailId })),
  inbox: () => Effect.succeed(DemoInbox)
});

/** Ledger service that lists the demo ledger and rejects mutations. */
const DemoLedgerServiceLive = Layer.succeed(LedgerService, {
  recordTriage: () => Effect.die(new Error(DEMO_UNAVAILABLE)),
  sendReply: () => Effect.die(new Error(DEMO_UNAVAILABLE)),
  archive: () => Effect.die(new Error(DEMO_UNAVAILABLE)),
  flagForReview: () => Effect.die(new Error(DEMO_UNAVAILABLE)),
  listLedger: (emailId) =>
    Effect.succeed(
      emailId === undefined
        ? demoLedger
        : demoLedger.filter((entry) => entry.emailId === emailId)
    ),
  undoAction: (entryId) => Effect.fail(new ActionNotFound({ entryId })),
  clearLedgerForEmail: () => Effect.die(new Error(DEMO_UNAVAILABLE)),
  clearLedger: () => Effect.die(new Error(DEMO_UNAVAILABLE))
});

/** Chat agent that rejects AI-backed operations in demo mode. */
const DemoChatAgentLive = Layer.succeed(ChatAgent, {
  resolveApproval: (approvalId) =>
    Effect.fail(new ApprovalNotFound({ approvalId })),
  chat: () => Effect.die(new Error(DEMO_UNAVAILABLE))
});

/** HttpApi groups for demo mode: no Postgres, no OpenRouter. */
const DemoCoreModulesLive = Layer.mergeAll(
  HttpSystemLive,
  HttpTriageLive.pipe(Layer.provide(DemoInboxOrchestratorLive)),
  HttpActionsLive.pipe(
    Layer.provide([DemoLedgerServiceLive, DemoChatAgentLive])
  ),
  HttpChatLive.pipe(Layer.provide(DemoChatAgentLive))
);

/** Root demo layer: same routes as live, seeded inbox, no external deps. */
export const DemoAppLive = Layer.mergeAll(
  HttpApiBuilder.layer(Api, { openapiPath: '/openapi.json' }).pipe(
    Layer.provide(DemoCoreModulesLive),
    Layer.provide(SchemaErrorHandlerLive)
  ),
  HttpApiScalar.layer(Api, { path: '/docs' })
);
