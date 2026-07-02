// Example: API module — see README.md for real codebase references

import { HttpApiSchema } from 'effect/unstable/httpapi'
import { Schema } from 'effect'
import { NoteId } from './Domain'

export class NoteNotFoundError extends Schema.TaggedError<NoteNotFoundError>()(
  'NoteNotFoundError',
  { id: NoteId },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class NoteTitleConflictError extends Schema.TaggedError<NoteTitleConflictError>()(
  'NoteTitleConflictError',
  { title: Schema.String },
  HttpApiSchema.annotations({ status: 409 })
) {}
