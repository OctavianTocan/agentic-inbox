'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type InboxClient,
  inboxClient,
  type ResolveApprovalInput,
  type RunTriageOptions
} from '@/lib/inbox/client';
import type { Inbox, TriageRunEvent } from '@/lib/inbox/types';

/** Inbox state plus the action handlers the panels call. */
export type UseInbox = {
  readonly inbox: Inbox | null;
  readonly isLoading: boolean;
  readonly refresh: () => Promise<void>;
  readonly runTriage: (
    options?: RunTriageOptions
  ) => AsyncIterable<TriageRunEvent>;
  readonly approve: (approvalId: string, editedBody?: string) => Promise<void>;
  readonly deny: (approvalId: string) => Promise<void>;
  readonly undo: (ledgerEntryId: string, emailId: string) => Promise<void>;
  readonly retriage: (emailId: string) => Promise<void>;
};

/** Whether an API failure came from resolving an approval that is no longer pending. */
function isApprovalNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('ApprovalNotFound');
}

/**
 * Drives the inbox against an `InboxClient`, exposing the current snapshot and
 * mutation handlers. Undo surfaces a sonner toast; approve/deny replace the
 * snapshot in place.
 *
 * @param client - Data seam to read and mutate; defaults to the shared HTTP client.
 * @returns The inbox snapshot, loading flag, and action handlers.
 */
export function useInbox(client: InboxClient = inboxClient): UseInbox {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const resolvingApprovalIdsRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const next = await client.getInbox();
      setInbox(next);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    void client
      .getInbox()
      .then((next) => {
        if (isActive) {
          setInbox(next);
        }
      })
      .catch(() => {
        // Leave inbox null; stop the spinner so a failed fetch cannot hang the UI.
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, [client]);

  const resolve = useCallback(
    async (approvalId: string, input: ResolveApprovalInput) => {
      if (resolvingApprovalIdsRef.current.has(approvalId)) {
        return;
      }
      resolvingApprovalIdsRef.current.add(approvalId);
      try {
        const next = await client.resolveApproval(approvalId, input);
        setInbox(next);
      } catch (error) {
        if (isApprovalNotFoundError(error)) {
          await refresh();
          toast('Approval already handled', {
            description: 'The inbox was refreshed with the latest state.'
          });
          return;
        }
        throw error;
      } finally {
        resolvingApprovalIdsRef.current.delete(approvalId);
      }
    },
    [client, refresh]
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

  const retriage = useCallback(
    async (emailId: string) => {
      const next = await client.retriage(emailId);
      setInbox(next);
      toast('Email re-triaged', {
        description: 'The agent re-processed this email.'
      });
    },
    [client]
  );

  const runTriage = useCallback(
    (options?: RunTriageOptions) => client.runTriage(options),
    [client]
  );

  return {
    inbox,
    isLoading,
    refresh,
    runTriage,
    approve,
    deny,
    undo,
    retriage
  };
}
