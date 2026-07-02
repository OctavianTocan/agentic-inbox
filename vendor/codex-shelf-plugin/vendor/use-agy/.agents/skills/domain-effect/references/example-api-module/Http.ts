// Example: API module — see README.md for real codebase references

import { Api } from '@contract/Api'
import { requirePolicy } from '@contract/Lib/Policy'
import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect, Layer } from 'effect'
import { requireRls } from '@/Infrastructure/Database/Rls'
import { withRateLimit } from '@/Infrastructure/RateLimit/Service'
import { NotesPolicy } from './Policy'
import { Notes } from './Service'

/** HTTP handler wiring for the notes API group. */
export const HttpNotesLive = HttpApiBuilder.group(
  Api,
  'notes',
  (handlers) =>
    Effect.gen(function* () {
      const notes = yield* Notes
      const policy = yield* NotesPolicy

      return handlers
        .handle('create', ({ payload }) =>
          notes
            .create(payload)
            .pipe(requireRls(), requirePolicy(policy.canCreate()), withRateLimit('write'))
        )
        .handle('list', ({ urlParams }) =>
          notes
            .list({ pagination: urlParams })
            .pipe(requireRls(), requirePolicy(policy.canList()), withRateLimit('read'))
        )
        .handle('get', ({ path }) =>
          notes
            .get(path.id)
            .pipe(requireRls(), requirePolicy(policy.canGet()), withRateLimit('read'))
        )
        .handle('update', ({ path, payload }) =>
          notes
            .update(path.id, payload)
            .pipe(requireRls(), requirePolicy(policy.canUpdate()), withRateLimit('write'))
        )
        .handle('delete', ({ path }) =>
          notes
            .delete(path.id)
            .pipe(requireRls(), requirePolicy(policy.canDelete()), withRateLimit('write'))
        )
    })
).pipe(Layer.provide(Notes.Default), Layer.provide(NotesPolicy.Default))
