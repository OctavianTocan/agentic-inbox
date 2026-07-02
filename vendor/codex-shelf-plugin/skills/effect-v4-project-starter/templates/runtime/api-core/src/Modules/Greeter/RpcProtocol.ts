import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import { GreetRequest, GreetResponse } from './Domain';
import { EmptyNameError } from './Errors';

/** RPC group for the Greeter contract. */
export const GreeterRpcs = RpcGroup.make(
  Rpc.make('greeter.greet', {
    payload: GreetRequest,
    success: GreetResponse,
    error: EmptyNameError,
  })
);
