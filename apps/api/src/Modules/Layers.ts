import { Layer } from 'effect';
import { HttpActionsLive } from './Actions/Http';
import { HttpChatLive } from './Chat/Http';
import { HttpSystemLive } from './System/Http';
import { HttpTriageLive } from './Triage/Http';

/** Merged runtime layers for every HttpApi group. */
export const CoreModulesLive = Layer.mergeAll(
  HttpSystemLive,
  HttpTriageLive,
  HttpActionsLive,
  HttpChatLive
);
