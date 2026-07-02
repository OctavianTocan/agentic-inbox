'use client';

import { useMemo } from 'react';
import {
  CircleCheckIcon,
  InboxIcon,
  RotateCcwIcon
} from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import { Markdown } from '@/design-system/components/ui/markdown/markdown';
import { Separator } from '@/design-system/components/ui/separator';
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  formatTimestamp,
  STATUS_LABELS,
  senderName,
  severityBadgeVariant,
  statusBadgeVariant
} from '@/lib/inbox/labels';
import type { InboxItem, LedgerEntry } from '@/lib/inbox/types';
import { EditAcceptCard } from './edit-accept-card';

type DetailPaneProps = {
  readonly item: InboxItem | null;
  readonly thread: readonly InboxItem[];
  readonly onApprove: (approvalId: string, editedBody?: string) => void;
  readonly onDeny: (approvalId: string) => void;
  readonly onUndo: (ledgerEntryId: string, emailId: string) => void;
};

/** Whether a ledger entry represents an in-effect (not-yet-undone) action. */
function isActiveAction(entry: LedgerEntry): boolean {
  return entry.action !== 'undo' && entry.undoneBy === null;
}

type EmailBlockProps = {
  readonly item: InboxItem;
  readonly isContext: boolean;
};

/** Full email header and body; dimmed when shown as prior thread context. */
function EmailBlock({ item, isContext }: EmailBlockProps) {
  const { email } = item;
  return (
    <div className={isContext ? 'opacity-70' : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-sm">{senderName(email.from)}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatTimestamp(email.timestamp)}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        To {email.to.join(', ')}
        {email.cc.length > 0 ? ` · Cc ${email.cc.join(', ')}` : ''}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
        {email.body}
      </p>
    </div>
  );
}

/**
 * Detail pane for the selected email: full email plus thread context, the
 * agent rationale and key facts, the merged edit/accept card for pending
 * approvals, and the action-plus-undo affordance for done items.
 *
 * @param item - Selected inbox item, or null when nothing is selected.
 * @param thread - Prior emails in the same thread, oldest first.
 * @param onApprove - Called with the approval id and final body on accept.
 * @param onDeny - Called with the approval id on deny.
 * @param onUndo - Called with the ledger entry id and email id on undo.
 * @returns The detail pane.
 */
export function DetailPane({
  item,
  thread,
  onApprove,
  onDeny,
  onUndo
}: DetailPaneProps) {
  const activeActions = useMemo(
    () => (item ? item.actions.filter(isActiveAction) : []),
    [item]
  );

  if (item === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
        <InboxIcon className="size-8" />
        <p className="text-sm">Select an email to see the agent's work.</p>
      </div>
    );
  }

  const { email, decision, status, pendingApproval } = item;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {decision ? (
            <Badge variant={severityBadgeVariant(decision.severity)}>
              {decision.severity}
            </Badge>
          ) : null}
          <Badge variant={statusBadgeVariant(status)}>
            {STATUS_LABELS[status]}
          </Badge>
          {decision ? (
            <Badge variant="outline">
              {CATEGORY_LABELS[decision.category]}
            </Badge>
          ) : null}
        </div>
        <h2 className="mt-2 font-semibold text-lg leading-snug">
          {email.subject}
        </h2>
      </div>

      <div className="flex flex-col gap-6 px-6 py-5">
        {thread.length > 0 ? (
          <div className="flex flex-col gap-4">
            {thread.map((context) => (
              <EmailBlock isContext item={context} key={context.email.id} />
            ))}
            <Separator />
          </div>
        ) : null}
        <EmailBlock isContext={false} item={item} />

        {decision ? (
          <div className="flex flex-col gap-4">
            <Separator />
            <section className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Why the agent decided this
              </h3>
              <div className="prose prose-sm max-w-none text-sm">
                <Markdown>{decision.rationale}</Markdown>
              </div>
            </section>
            {decision.keyFacts.length > 0 ? (
              <section className="flex flex-col gap-2 rounded-md bg-muted/60 p-4">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Key facts
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {decision.keyFacts.map((fact) => (
                    <li className="flex gap-2" key={fact}>
                      <span className="text-muted-foreground">·</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {pendingApproval ? (
          <EditAcceptCard
            approval={pendingApproval}
            onApprove={onApprove}
            onDeny={onDeny}
          />
        ) : null}

        {activeActions.length > 0 ? (
          <section className="flex flex-col gap-2">
            <Separator />
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              What the agent did
            </h3>
            {activeActions.map((entry) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                key={entry.id}
              >
                <span className="flex items-center gap-2 text-sm">
                  <CircleCheckIcon className="size-4 text-success" />
                  {entry.summary}
                  <Badge variant="secondary">
                    {ACTION_LABELS[entry.action]}
                  </Badge>
                </span>
                <Button
                  onClick={() => onUndo(entry.id, email.id)}
                  size="sm"
                  variant="ghost"
                >
                  <RotateCcwIcon />
                  Undo
                </Button>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
