'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  type InboxClient,
  inboxClient,
  type ResolveApprovalInput
} from '@/lib/inbox/client';
import type { Inbox } from '@/lib/inbox/types';

/** Inbox state plus the action handlers the panels call. */
export type UseInbox = {
  readonly inbox: Inbox | null;
  readonly isLoading: boolean;
  readonly approve: (approvalId: string, editedBody?: string) => Promise<void>;
  readonly deny: (approvalId: string) => Promise<void>;
  readonly undo: (ledgerEntryId: string, emailId: string) => Promise<void>;
};

/**
 * Drives the inbox against an `InboxClient`, exposing the current snapshot and
 * mutation handlers. Undo surfaces a sonner toast; approve/deny replace the
 * snapshot in place.
 *
 * @param client - Data seam to read and mutate; defaults to the shared mock client.
 * @returns The inbox snapshot, loading flag, and action handlers.
 */
export function useInbox(client: InboxClient = inboxClient): UseInbox {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    void client.getInbox().then((next) => {
      if (isActive) {
        setInbox(next);
        setIsLoading(false);
      }
    });
    return () => {
      isActive = false;
    };
  }, [client]);

  const resolve = useCallback(
    async (approvalId: string, input: ResolveApprovalInput) => {
      const next = await client.resolveApproval(approvalId, input);
      setInbox(next);
    },
    [client]
  );

  const approve = useCallback(
    (approvalId: string, editedBody?: string) =>
      resolve(
        approvalId,
        editedBody === undefined
          ? { verdict: 'approve' }
          : { verdict: 'approve', editedBody }
      ),
    [resolve]
  );

  const deny = useCallback(
    (approvalId: string) => resolve(approvalId, { verdict: 'deny' }),
    [resolve]
  );

  const undo = useCallback(
    async (ledgerEntryId: string, emailId: string) => {
      const next = await client.undoAction(ledgerEntryId, emailId);
      setInbox(next);
      toast('Action undone', {
        description: 'The email is back in Needs attention.',
        action: {
          label: 'View',
          onClick: () => {
            const row = document.querySelector(`[data-email-id="${emailId}"]`);
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    },
    [client]
  );

  return { inbox, isLoading, approve, deny, undo };
}
