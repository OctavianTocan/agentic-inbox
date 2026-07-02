// Example: API module — see README.md for real codebase references

import { hasScope, policy } from '@contract/Lib/Policy'
import { Effect } from 'effect'

/** Authorization policy for note operations. */
export class NotesPolicy extends Effect.Service<NotesPolicy>()(
  '@app/api/Notes/Policy',
  {
    effect: Effect.gen(function* () {
      /** Fails with `Unauthorized` unless the caller has the `notes:write` scope. */
      const canCreate = () =>
        policy('Note', 'create', hasScope('notes:write'))

      /** Fails with `Unauthorized` unless the caller has the `notes:read` scope. */
      const canGet = () => policy('Note', 'read', hasScope('notes:read'))

      /** Fails with `Unauthorized` unless the caller has the `notes:write` scope. */
      const canUpdate = () =>
        policy('Note', 'update', hasScope('notes:write'))

      /** Fails with `Unauthorized` unless the caller has the `notes:write` scope. */
      const canDelete = () =>
        policy('Note', 'delete', hasScope('notes:write'))

      /** Fails with `Unauthorized` unless the caller has the `notes:read` scope. */
      const canList = () => policy('Note', 'list', hasScope('notes:read'))

      return {
        canCreate,
        canGet,
        canUpdate,
        canDelete,
        canList,
      } as const
    }),
  }
) {}
