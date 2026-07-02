// Example: API module — see README.md for real codebase references

import type { NoteId } from '@contract/Modules/Notes/Domain'
import type { PaginationInput } from '@core/server/Pagination'
import { DateTime, Effect, Option, Schema } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

const DEFAULT_LIMIT = 20

/** Row shape for the `note` table. */
export const NoteRow = Schema.Struct({
  id: Schema.String,
  organizationId: Schema.String,
  title: Schema.String,
  content: Schema.NullOr(Schema.String),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
})
export type NoteRow = typeof NoteRow.Type

export type NoteInsert = { readonly title: string; readonly content: string | null }

export type NoteUpdate = Partial<{ readonly title: string; readonly content: string | null }>

/** Data-access layer for the `note` table. */
export class NotesRepo extends Effect.Service<NotesRepo>()(
  '@app/api/Notes/Repo',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      /** Look up a note by its primary key; `Option.none()` when absent. */
      const find = Effect.fn('NotesRepo.find')(function* (id: NoteId) {
        const rows = yield* sql<NoteRow>`SELECT * FROM note WHERE id = ${id} LIMIT 1`
        return Option.fromNullable(rows[0])
      })

      /** List notes with cursor-based pagination, returning rows plus a `hasMore` flag. */
      const findMany = Effect.fn('NotesRepo.findMany')(function* (query?: {
        pagination?: PaginationInput
      }) {
        const limit = query?.pagination?.limit ?? DEFAULT_LIMIT
        const after = query?.pagination?.after
        const where = after ? sql`WHERE id < ${after}` : sql``

        const rows = yield* sql<NoteRow>`
          SELECT * FROM note ${where} ORDER BY id DESC LIMIT ${limit + 1}
        `

        const hasMore = rows.length > limit
        return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore }
      })

      /** Insert a new note row and return it. */
      const insert = Effect.fn('NotesRepo.insert')(function* (values: NoteInsert) {
        const rows = yield* sql<NoteRow>`INSERT INTO note ${sql.insert(values)} RETURNING *`
        return rows[0]
      })

      /** Partially update a note; caller must strip undefined values first. `Option.none()` when absent. */
      const update = Effect.fn('NotesRepo.update')(function* (
        id: NoteId,
        values: NoteUpdate
      ) {
        // A no-op update has nothing to SET; treat it as a find.
        if (Object.keys(values).length === 0) {
          return yield* find(id)
        }
        const now = yield* DateTime.now
        const rows = yield* sql<NoteRow>`
          UPDATE note
          SET ${sql.update({ ...values, updatedAt: DateTime.toDateUtc(now) })}
          WHERE id = ${id}
          RETURNING *
        `
        return Option.fromNullable(rows[0])
      })

      /** Delete a note by primary key; `Option.none()` when absent. */
      const del = Effect.fn('NotesRepo.delete')(function* (id: NoteId) {
        const rows = yield* sql<NoteRow>`DELETE FROM note WHERE id = ${id} RETURNING *`
        return Option.fromNullable(rows[0])
      })

      return { find, findMany, insert, update, delete: del } as const
    }),
  }
) {}
