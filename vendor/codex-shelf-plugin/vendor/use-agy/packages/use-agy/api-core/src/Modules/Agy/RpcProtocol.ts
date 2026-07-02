import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import {
  AgyJsonRunResponse,
  AgyRunRequest,
  AgyStatus,
  AgyTextRunResponse,
} from './Domain';
import {
  AgyJsonParseError,
  AgyRunError,
  AgyUnavailableError,
  AgyValidationError,
} from './Errors';

const AgyRunTextError = Schema.Union([
  AgyValidationError,
  AgyRunError,
  AgyUnavailableError,
]);

const AgyRunJsonError = Schema.Union([
  AgyValidationError,
  AgyRunError,
  AgyUnavailableError,
  AgyJsonParseError,
]);

/** RPC group for local AGY status and execution contracts. */
export const AgyRpcs = RpcGroup.make(
  Rpc.make('agy.status', {
    success: AgyStatus,
    error: AgyUnavailableError,
  }),
  Rpc.make('agy.runText', {
    payload: AgyRunRequest,
    success: AgyTextRunResponse,
    error: AgyRunTextError,
  }),
  Rpc.make('agy.runJson', {
    payload: AgyRunRequest,
    success: AgyJsonRunResponse,
    error: AgyRunJsonError,
  })
);

//<skill-gen>
// ---
// name: use-agy
// description: "Use AGY through the shared Effect service, Bun CLI, and local API/RPC runtime."
// ---
//
// ## RPC Contract
//
// - `AgyRpcs` is the transport-neutral RPC contract for local AGY access.
// - Current procedures are `agy.status`, `agy.runText`, and `agy.runJson`.
// - Request and response fields intentionally match the shared Effect service:
//   `prompt`, optional `cwd`, optional `model`, optional `sandbox`, optional
//   `addDirs`, optional `timeout`, plus captured output fields.
// - Keep protocol errors schema-backed and tagged so clients can handle
//   validation, run failures, unavailable service, and JSON parse failures
//   separately.
// - Change this contract only with matching updates to HTTP handlers, RPC
//   handlers, CLI documentation, and tests.
//</skill-gen>
