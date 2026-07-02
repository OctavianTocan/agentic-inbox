// Example: API module — see README.md for real codebase references
//
// Observability: auth.user_id and auth.org_id are already in scope from
// the auth middleware (Tier 1). Simple CRUD methods don't need their own
// annotations — the Effect.fn span name + scope context is sufficient.

import { catchDbViolation } from '@contract/Lib/Errors'
import { stripUndefined } from '@core/effect/Helpers'
import type {
  NoteCreateInput,
  NoteId,
  NoteListOptions,
  NoteUpdateInput,
} from '@contract/Modules/Notes/Domain'
import { Note } from '@contract/Modules/Notes/Domain'
import {
  NoteNotFoundError,
  NoteTitleConflictError,
} from '@contract/Modules/Notes/Errors'
import { PaginatedResult } from '@core/server/Pagination'
import { Effect, Option } from 'effect'
import { NotesRepo } from './Repo'

/**
 * Manages note CRUD with title uniqueness.
 *
 * @errors NoteNotFoundError, NoteTitleConflictError
 */
export class Notes extends Effect.Service<Notes>()('@app/api/Notes', {
  dependencies: [NotesRepo.Default],
  effect: Effect.gen(function* () {
    const repo = yield* NotesRepo

    /** Converts an Option repo result into a typed NotFound error. */
    const getOrNotFound = <A>(id: NoteId, result: Option.Option<A>) =>
      Option.match(result, {
        onNone: () => new NoteNotFoundError({ id }),
        onSome: (row) => Effect.succeed(row),
      })

    /**
     * Creates a note.
     *
     * @param input - Title and optional content.
     * @returns The created Note entity.
     * @errors NoteTitleConflictError when the title already exists.
     */
    const create = Effect.fn('Notes.create')(function* (input: NoteCreateInput) {
      const row = yield* repo
        .insert({
          title: input.title,
          content: input.content ?? null,
        })
        .pipe(
          catchDbViolation({
            onUnique: () => new NoteTitleConflictError({ title: input.title }),
          })
        )

      return new Note(row)
    })

    /**
     * Retrieves a single note by id.
     *
     * @param id - Note identifier.
     * @returns The Note entity.
     * @errors NoteNotFoundError when no note exists with the id.
     */
    const get = Effect.fn('Notes.get')(function* (id: NoteId) {
      const row = yield* repo.find(id).pipe(Effect.flatMap((r) => getOrNotFound(id, r)))
      return new Note(row)
    })

    /**
     * Lists notes with cursor-based pagination.
     *
     * @param options - Optional pagination cursor and page size.
     * @returns A page of Note entities plus a `hasMore` flag.
     * @errors None — listing always succeeds for a valid tenant.
     */
    const list = Effect.fn('Notes.list')(function* (options?: NoteListOptions) {
      const { rows, hasMore } = yield* repo.findMany({
        pagination: options?.pagination,
      })
      return new PaginatedResult(
        rows.map((r) => new Note(r)),
        hasMore
      )
    })

    /**
     * Updates a note's title or content.
     *
     * @param id - Note identifier.
     * @param input - Fields to update.
     * @returns The updated Note entity.
     * @errors NoteNotFoundError, NoteTitleConflictError
     */
    const update = Effect.fn('Notes.update')(function* (
      id: NoteId,
      input: NoteUpdateInput
    ) {
      const { title, content } = input
      const row = yield* repo
        .update(id, stripUndefined({ title, content }))
        .pipe(
          catchDbViolation({
            onUnique: () => new NoteTitleConflictError({ title: title ?? '' }),
          }),
          Effect.flatMap((r) => getOrNotFound(id, r))
        )
      return new Note(row)
    })

    /**
     * Deletes a note by id.
     *
     * @param id - Note identifier.
     * @returns The deleted Note entity.
     * @errors NoteNotFoundError
     */
    const del = Effect.fn('Notes.delete')(function* (id: NoteId) {
      const row = yield* repo.delete(id).pipe(Effect.flatMap((r) => getOrNotFound(id, r)))
      return new Note(row)
    })

    return { create, get, list, update, delete: del } as const
  }),
}) {}
