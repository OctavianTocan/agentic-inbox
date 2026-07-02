import { GreeterRpcs } from '@{{SCOPE}}/api-core/Modules/Greeter/RpcProtocol';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { RPC_PATH } from '../../Constants';
import { LocalGreeterApi, layer as LocalGreeterApiLive } from './Service';

/** RPC handlers for the local Greeter RPC protocol. */
export const GreeterRpcHandlersLive = GreeterRpcs.toLayer(
  Effect.gen(function* () {
    const greeter = yield* LocalGreeterApi;

    return GreeterRpcs.of({
      'greeter.greet': (input) => greeter.greet(input),
    });
  })
).pipe(Layer.provide(LocalGreeterApiLive));

/** HTTP transport layer serving the Greeter RPC group at the local RPC path. */
export const GreeterRpcHttpLive = RpcServer.layerHttp({
  group: GreeterRpcs,
  path: RPC_PATH,
  protocol: 'http',
  disableFatalDefects: true,
}).pipe(
  Layer.provide(GreeterRpcHandlersLive),
  Layer.provide(RpcSerialization.layerNdjson)
);
