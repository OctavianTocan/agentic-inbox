import { Effect } from 'effect';

export { AppLive } from './App';
export {
  type ApiWebHandler,
  type ApiWebHandlerOptions,
  createApiWebHandler
} from './WebHandler';

/** Proves backend module resolution for typecheck and smoke imports. */
export const ready = Effect.void;
