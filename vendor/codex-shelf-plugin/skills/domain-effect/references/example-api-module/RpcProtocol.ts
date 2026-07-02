// Example: API module — see README.md for real codebase references

import { Rpc, RpcGroup } from 'effect/unstable/rpc'
import { Schema } from 'effect'
import { RpcAuthentication } from '../Authentication/RpcProtocol'
import { Note, NoteId } from './Domain'
import { NoteNotFoundError } from './Errors'

/**
 * RPC protocol for internal service-to-service note operations.
 * Used by internal services over the M2M transport.
 */
export class NotesRpcs extends RpcGroup.make(
  Rpc.make('notes.get', {
    payload: Schema.Struct({ noteId: NoteId }),
    success: Note,
    error: NoteNotFoundError,
  })
).middleware(RpcAuthentication) {}
