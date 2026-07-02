// Example: API module — see README.md for real codebase references

import { HttpApiEndpoint, HttpApiGroup, OpenApi } from 'effect/unstable/httpapi'
import { PaginatedResponse, PaginationParams } from '@core/server/Pagination'
import { Schema } from 'effect'
import { Unauthorized } from '../../Lib/Policy'
import { Authentication } from '../Authentication/Api'
import {
  NoteCreateInput,
  Note,
  NoteId,
  NoteUpdateInput,
} from './Domain'
import {
  NoteNotFoundError,
  NoteTitleConflictError,
} from './Errors'

/** HTTP API group for note management endpoints. */
export class NotesApi extends HttpApiGroup.make('notes')
  .addError(Unauthorized)
  .add(
    HttpApiEndpoint.post('create', '/')
      .addSuccess(Note)
      .addError(NoteTitleConflictError)
      .setPayload(NoteCreateInput)
      .annotate(OpenApi.Summary, 'Create note')
      .annotate(OpenApi.Description, 'Creates a new note scoped to the current organization')
  )
  .add(
    HttpApiEndpoint.get('list', '/')
      .setUrlParams(PaginationParams)
      .addSuccess(PaginatedResponse(Note))
      .annotate(OpenApi.Summary, 'List notes')
      .annotate(OpenApi.Description, 'Lists notes with cursor-based pagination')
  )
  .add(
    HttpApiEndpoint.get('get', '/:id')
      .setPath(Schema.Struct({ id: NoteId }))
      .addSuccess(Note)
      .addError(NoteNotFoundError)
      .annotate(OpenApi.Summary, 'Get note')
      .annotate(OpenApi.Description, 'Retrieves a note by its identifier')
  )
  .add(
    HttpApiEndpoint.patch('update', '/:id')
      .setPath(Schema.Struct({ id: NoteId }))
      .addSuccess(Note)
      .addError(NoteNotFoundError)
      .addError(NoteTitleConflictError)
      .setPayload(NoteUpdateInput)
      .annotate(OpenApi.Summary, 'Update note')
      .annotate(OpenApi.Description, 'Updates a note\'s title or content')
  )
  .add(
    HttpApiEndpoint.del('delete', '/:id')
      .setPath(Schema.Struct({ id: NoteId }))
      .addSuccess(Note)
      .addError(NoteNotFoundError)
      .annotate(OpenApi.Summary, 'Delete note')
      .annotate(OpenApi.Description, 'Permanently deletes a note')
  )
  .middleware(Authentication)
  .prefix('/notes')
  .annotate(OpenApi.Title, 'Notes')
  .annotate(OpenApi.Description, 'Note management') {}
