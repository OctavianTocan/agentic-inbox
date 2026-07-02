import { Layer } from 'effect';
import { HttpAiLive } from './Ai/Http';
import { HttpSystemLive } from './System/Http';

/** Merged runtime layers for every starter HttpApi group. */
export const CoreModulesLive = Layer.mergeAll(HttpSystemLive, HttpAiLive);
