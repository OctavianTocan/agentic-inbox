// Example: API module — see README.md for real codebase references

import { PaginationInput } from '@core/server/Pagination'
import { Schema } from 'effect'

export const NoteId = Schema.String.pipe(Schema.brand('NoteId'))
export type NoteId = typeof NoteId.Type

/** A note scoped to an organization. */
export class Note extends Schema.Class<Note>('Note')(
  {
    id: NoteId.annotations({ description: 'Unique note identifier' }),
    organizationId: Schema.String.annotations({
      description: 'Organization the note belongs to',
    }),
    title: Schema.String.annotations({ description: 'Title of the note' }),
    content: Schema.NullOr(Schema.String).annotations({
      description: 'Body content of the note',
    }),
    createdAt: Schema.Date.annotations({ description: 'When the note was created' }),
    updatedAt: Schema.Date.annotations({ description: 'When the note was last updated' }),
  },
  {
    identifier: 'Note',
    title: 'Note',
    description: 'A note scoped to an organization',
  }
) {}

/** Input for creating a note. Used by API endpoint and service. */
export class NoteCreateInput extends Schema.Class<NoteCreateInput>('NoteCreateInput')(
  {
    title: Schema.String.pipe(
      Schema.minLength(1),
      Schema.maxLength(256)
    ).annotations({ description: 'Title for the note' }),
    content: Schema.optional(
      Schema.String.pipe(Schema.maxLength(65_536)).annotations({
        description: 'Optional body content',
      })
    ),
  },
  {
    identifier: 'NoteCreateInput',
    title: 'Create Note',
    description: 'Input for creating a new note',
  }
) {}

/** Input for updating a note. Used by API endpoint and service. */
export class NoteUpdateInput extends Schema.Class<NoteUpdateInput>('NoteUpdateInput')(
  {
    title: Schema.optional(
      Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)).annotations({
        description: 'Updated title',
      })
    ),
    content: Schema.optional(
      Schema.NullOr(Schema.String.pipe(Schema.maxLength(65_536))).annotations({
        description: 'Updated content (null to clear)',
      })
    ),
  },
  {
    identifier: 'NoteUpdateInput',
    title: 'Update Note',
    description: 'Input for updating a note',
  }
) {}

/** Options for listing notes. */
export class NoteListOptions extends Schema.Class<NoteListOptions>('NoteListOptions')(
  {
    pagination: Schema.optional(PaginationInput),
  },
  {
    identifier: 'NoteListOptions',
    title: 'List Notes Options',
    description: 'Options controlling note list queries',
  }
) {}

