import { AgyRpcs } from '@use-agy/api-core/Modules/Agy/RpcProtocol';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { RPC_PATH } from '../../Constants';
import { LocalAgyApi, layer as LocalAgyApiLive } from './Service';

/** RPC handlers for the local AGY RPC protocol. */
export const AgyRpcHandlersLive = AgyRpcs.toLayer(
  Effect.gen(function* () {
    const agy = yield* LocalAgyApi;

    return AgyRpcs.of({
      'agy.status': () => agy.status(),
      'agy.runText': (input) => agy.runText(input),
      'agy.runJson': (input) => agy.runJson(input),
    });
  })
).pipe(Layer.provide(LocalAgyApiLive));

/** HTTP transport layer serving the AGY RPC group at the local RPC path. */
export const AgyRpcHttpLive = RpcServer.layerHttp({
  group: AgyRpcs,
  path: RPC_PATH,
  protocol: 'http',
  disableFatalDefects: true,
}).pipe(
  Layer.provide(AgyRpcHandlersLive),
  Layer.provide(RpcSerialization.layerNdjson)
);

//<skill-gen>
// ---
// name: use-agy
// description: "Use AGY through the shared Effect service, Bun CLI, and local API/RPC runtime."
// ---
//
// # use-agy
//
// Use this skill when an agent should route agentic work through AGY using the
// repo's shared toolkit rather than spawning `agy` ad hoc.
//
// ## Local API/RPC Runtime
//
// - `apps/api` is a local-only Bun runtime for the HTTP and RPC contracts.
// - Runtime handlers delegate through `LocalAgyApi`, which delegates to the
//   shared `Agy` service and maps service errors to public API/RPC errors.
// - Default server config binds to loopback only; non-local bind hosts are
//   rejected by config parsing.
// - RPC is served at `/rpc` over Effect's HTTP RPC protocol with NDJSON
//   serialization.
// - Keep this layer thin: no direct subprocess calls, no queueing, no prompt
//   parsing, and no transport-specific business behavior.
//</skill-gen>
