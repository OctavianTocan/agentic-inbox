'use client';

import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  BanIcon,
  CheckIcon,
  CircleCheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FlagIcon,
  InboxIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon
} from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@/design-system/components/ui/context-menu';
import { Kbd } from '@/design-system/components/ui/kbd';
import { Markdown } from '@/design-system/components/ui/markdown/markdown';
import { useScrollFade } from '@/design-system/components/ui/scroll-fade';
import { Separator } from '@/design-system/components/ui/separator';
import { useCopyToClipboard } from '@/design-system/hooks/use-copy-to-clipboard';
import { cn } from '@/design-system/lib/utils';
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
  readonly onClose?: () => void;
  readonly bordered?: boolean;
  readonly reserveHeaderRight?: boolean;
};

/** Whether a ledger entry represents an in-effect (not-yet-undone) action. */
function isActiveAction(entry: LedgerEntry): boolean {
  return entry.action !== 'undo' && entry.undoneBy === null;
}

type PaneCloseButtonProps = {
  readonly onClose: () => void;
  readonly className?: string;
};

/** Icon button that dismisses the detail pane. */
function PaneCloseButton({ onClose, className }: PaneCloseButtonProps) {
  return (
    <Button
      aria-label="Close email"
      className={cn('shrink-0', className)}
      onClick={onClose}
      size="icon-sm"
      variant="ghost"
    >
      <XIcon className="size-4" />
    </Button>
  );
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
 * @param onClose - Called when the user dismisses the pane; the close control is omitted when absent.
 * @param bordered - Whether the header carries a bottom border; off makes the pane one seamless surface for the mobile sheet.
 * @param reserveHeaderRight - Whether to reserve space at the header's right edge for the floating chat-toggle overlay, so the close button never sits under it.
 * @returns The detail pane.
 */
export function DetailPane({
  item,
  thread,
  onApprove,
  onDeny,
  onUndo,
  onClose,
  bordered = true,
  reserveHeaderRight = false
}: DetailPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollFade(scrollRef);
  const { copy } = useCopyToClipboard();

  const activeActions = useMemo(
    () => (item ? item.actions.filter(isActiveAction) : []),
    [item]
  );
  const doneActions = useMemo(
    () => activeActions.filter((entry) => entry.action !== 'flag_for_review'),
    [activeActions]
  );
  const deferrals = useMemo(
    () => activeActions.filter((entry) => entry.action === 'flag_for_review'),
    [activeActions]
  );
  const undoableAction = activeActions.at(0) ?? null;

  const copyValue = (value: string, label: string) => {
    void copy(value).then((ok) => {
      if (ok) {
        toast(`Copied ${label}`);
      }
    });
  };

  if (item === null) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
        {onClose ? (
          <PaneCloseButton
            className="absolute top-3 right-3"
            onClose={onClose}
          />
        ) : null}
        <InboxIcon className="size-8" />
        <p className="text-sm">Select an email to see the agent's work.</p>
      </div>
    );
  }

  const { email, classification, status, pendingApproval } = item;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className={cn(
          'flex shrink-0 items-start gap-3 bg-card px-6 py-4',
          bordered && 'border-b',
          reserveHeaderRight && 'pr-20'
        )}
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-lg leading-snug">
            {email.subject}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {classification ? (
              <Badge variant={severityBadgeVariant(classification.severity)}>
                {classification.severity}
              </Badge>
            ) : null}
            <Badge variant={statusBadgeVariant(status)}>
              {STATUS_LABELS[status]}
            </Badge>
            {classification ? (
              <Badge variant="outline">
                {CATEGORY_LABELS[classification.category]}
              </Badge>
            ) : null}
          </div>
        </div>
        {onClose ? <PaneCloseButton onClose={onClose} /> : null}
      </div>

      <div
        className="scroll-fade min-h-0 flex-1 px-6 pt-7 pb-5"
        ref={scrollRef}
      >
        <div className="flex flex-col gap-6">
          {thread.length > 0 ? (
            <div className="flex flex-col gap-4">
              {thread.map((context) => (
                <EmailBlock isContext item={context} key={context.email.id} />
              ))}
              <Separator />
            </div>
          ) : null}
          <ContextMenu>
            <ContextMenuTrigger className="select-text">
              <EmailBlock isContext={false} item={item} />
            </ContextMenuTrigger>
            <ContextMenuContent>
              {pendingApproval ? (
                <>
                  <ContextMenuItem
                    onClick={() => onApprove(pendingApproval.id)}
                  >
                    <CheckIcon />
                    Approve
                    <ContextMenuShortcut>
                      <Kbd variant="ghost">E</Kbd>
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => onDeny(pendingApproval.id)}
                    variant="destructive"
                  >
                    <BanIcon />
                    Deny
                    <ContextMenuShortcut>
                      <Kbd variant="ghost">D</Kbd>
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              ) : null}
              {undoableAction ? (
                <>
                  <ContextMenuItem
                    onClick={() => onUndo(undoableAction.id, email.id)}
                  >
                    <RotateCcwIcon />
                    Undo
                    <ContextMenuShortcut>
                      <Kbd variant="ghost">U</Kbd>
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              ) : null}
              <ContextMenuItem
                onClick={() => copyValue(email.subject, 'subject')}
              >
                <CopyIcon />
                Copy subject
              </ContextMenuItem>
              <ContextMenuItem onClick={() => copyValue(email.id, 'email ID')}>
                <CopyIcon />
                Copy email ID
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem render={<Link href="/audit" />}>
                <ExternalLinkIcon />
                Open in Audit
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {classification ? (
            <div className="flex flex-col gap-4 rounded-md border-primary/40 border-l-2 bg-accent/50 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <SparklesIcon className="size-3.5 text-primary" />
                <span className="font-medium text-xs uppercase tracking-wide">
                  Agent
                </span>
              </div>
              <section className="flex flex-col gap-2">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Why the agent decided this
                </h3>
                <Markdown containerProps={{ className: 'prose-sm max-w-none' }}>
                  {classification.rationale}
                </Markdown>
              </section>
              {classification.keyFacts.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Key facts
                  </h3>
                  <ul className="flex flex-col gap-1 text-sm">
                    {classification.keyFacts.map((fact) => (
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

          {doneActions.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-md border-primary/40 border-l-2 bg-accent/50 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <SparklesIcon className="size-3.5 text-primary" />
                <span className="font-medium text-xs uppercase tracking-wide">
                  Agent
                </span>
              </div>
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                What the agent did
              </h3>
              {doneActions.map((entry) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
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

          {deferrals.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-md border-primary/40 border-l-2 bg-accent/50 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FlagIcon className="size-3.5 text-primary" />
                <span className="font-medium text-xs uppercase tracking-wide">
                  Held for you
                </span>
              </div>
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Why the agent did not act
              </h3>
              {deferrals.map((entry) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                  key={entry.id}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <FlagIcon className="size-4 text-primary" />
                    {entry.summary}
                    <Badge variant="attention">Deferred to you</Badge>
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
    </div>
  );
}
