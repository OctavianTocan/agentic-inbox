// Example: API module — see README.md for real codebase references

import { Effect, Layer } from 'effect'
import { NotesRpcs } from '@contract/Modules/Notes/RpcProtocol'
import { logAndDie } from '@contract/Lib/Rpc'
import { Notes } from './Service'

/** RPC handler implementations for note operations. */
export const NotesRpcLive = NotesRpcs.toLayer(
  Effect.gen(function* () {
    const notes = yield* Notes

    return {
      'notes.get': ({ noteId }) =>
        notes.get(noteId).pipe(logAndDie),
    }
  })
).pipe(Layer.provide(Notes.Default))
