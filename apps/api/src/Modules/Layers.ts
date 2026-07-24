import { Layer } from 'effect';
import { HttpActionsLive } from './Actions/Http';
import { LedgerServiceLive } from './Actions/Service';
import { ChatAgentLive } from './Agent/ChatAgent';
import { HttpChatLive } from './Chat/Http';
import { HttpSystemLive } from './System/Http';
import { HttpTriageLive } from './Triage/Http';
import { InboxOrchestratorLive } from './Triage/Service';

/** Merged runtime layers for every HttpApi group. */
export const CoreModulesLive = Layer.mergeAll(
  HttpSystemLive,
  HttpTriageLive.pipe(Layer.provide(InboxOrchestratorLive)),
  HttpActionsLive.pipe(Layer.provide([LedgerServiceLive, ChatAgentLive])),
  HttpChatLive.pipe(Layer.provide(ChatAgentLive))
);
