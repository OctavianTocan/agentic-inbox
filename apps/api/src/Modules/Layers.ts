import { Layer } from 'effect';
import { HttpActionsLive } from './Actions/Http';
import { ActionServiceLive } from './Actions/Service';
import { AgentServiceLive } from './Agent/Service';
import { HttpChatLive } from './Chat/Http';
import { HttpSystemLive } from './System/Http';
import { HttpTriageLive } from './Triage/Http';
import { TriageServiceLive } from './Triage/Service';

/** Merged runtime layers for every HttpApi group. */
export const CoreModulesLive = Layer.mergeAll(
  HttpSystemLive,
  HttpTriageLive.pipe(Layer.provide(TriageServiceLive)),
  HttpActionsLive.pipe(Layer.provide([ActionServiceLive, AgentServiceLive])),
  HttpChatLive.pipe(Layer.provide(AgentServiceLive))
);
