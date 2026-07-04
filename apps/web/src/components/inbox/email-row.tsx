'use client';

import Link from 'next/link';
import type { Components } from 'react-markdown';
import { toast } from 'sonner';
import {
  BanIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  ListFilterIcon,
  RefreshCwIcon,
  RotateCcwIcon
} from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/design-system/components/ui/context-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@/design-system/components/ui/item';
import { Kbd } from '@/design-system/components/ui/kbd';
import { Markdown } from '@/design-system/components/ui/markdown/markdown';
import { useCopyToClipboard } from '@/design-system/hooks/use-copy-to-clipboard';
import { cn } from '@/design-system/lib/utils';
import {
  formatTimestamp,
  projectOf,
  STATUS_LABELS,
  senderName,
  severityBadgeVariant,
  statusBadgeVariant
} from '@/lib/inbox/labels';
import type { InboxItem, LedgerEntry } from '@/lib/inbox/types';
import type { InboxFilters } from './filters';

/** Whether a ledger entry represents an in-effect (not-yet-undone) action. */
function isUndoableAction(entry: LedgerEntry): boolean {
  return entry.action !== 'undo' && entry.undoneBy === null;
}

/**
 * Block-level markdown mapped to inline spans so a preview flattens onto one
 * text flow: paragraphs, list items, and headings become space-separated runs
 * instead of stacked blocks, which keeps `line-clamp` measuring line count
 * consistently across rows regardless of the body's markdown structure.
 */
const INLINE_PREVIEW_COMPONENTS: Partial<Components> = {
  p: ({ children }) => <span>{children} </span>,
  ul: ({ children }) => <span>{children}</span>,
  ol: ({ children }) => <span>{children}</span>,
  li: ({ children }) => <span>{children} </span>,
  h1: ({ children }) => <span>{children} </span>,
  h2: ({ children }) => <span>{children} </span>,
  h3: ({ children }) => <span>{children} </span>,
  h4: ({ children }) => <span>{children} </span>,
  h5: ({ children }) => <span>{children} </span>,
  h6: ({ children }) => <span>{children} </span>,
  blockquote: ({ children }) => <span>{children} </span>,
  hr: () => <span> </span>,
  br: () => <span> </span>,
  pre: ({ children }) => <span>{children} </span>,
  code: ({ children }) => (
    <code className="font-normal font-sans">{children}</code>
  ),
  strong: ({ children }) => <span className="font-normal">{children}</span>,
  b: ({ children }) => <span className="font-normal">{children}</span>
};

type PreviewMarkdownProps = {
  readonly children: string;
};

/**
 * Inline markdown preview: renders emphasis and code but flattens block
 * structure to a single clamp-friendly text flow.
 *
 * @param children - Raw markdown source to render.
 * @returns The inline-rendered preview.
 */
function PreviewMarkdown({ children }: PreviewMarkdownProps) {
  return (
    <Markdown
      as="span"
      components={INLINE_PREVIEW_COMPONENTS}
      containerProps={{ className: 'not-prose' }}
    >
      {children}
    </Markdown>
  );
}

type EmailRowProps = {
  readonly item: InboxItem;
  readonly isSelected: boolean;
  readonly isDimmed: boolean;
  readonly filters: InboxFilters;
  readonly onSelect: (emailId: string) => void;
  readonly onApprove: (approvalId: string) => void;
  readonly onDeny: (approvalId: string) => void;
  readonly onUndo: (ledgerEntryId: string, emailId: string) => void;
  readonly onRetriage: (emailId: string) => void;
  readonly onFiltersChange: (filters: InboxFilters) => void;
};

/**
 * One inbox list row: sender, subject, why-preview, status/severity chips, and
 * timestamp. Untriaged items (no decision) render a neutral "Not triaged" chip
 * instead. When an approval is pending it shows inline Approve/Deny buttons.
 *
 * @param item - The joined email, decision, status, and pending state.
 * @param isSelected - Whether this row is the open detail selection.
 * @param isDimmed - Whether the row is shown quietly (reviewed, handled, or untriaged).
 * @param filters - Active filters, used to build the "Filter by" submenu state.
 * @param onSelect - Called with the email id when the row is activated.
 * @param onApprove - Called with the approval id to approve inline.
 * @param onDeny - Called with the approval id to deny inline.
 * @param onUndo - Called with the ledger entry id and email id to undo an in-effect action.
 * @param onRetriage - Called with the email id to re-run the agent on just this email.
 * @param onFiltersChange - Called with the next filters when a "Filter by" choice is made.
 * @returns The list row.
 */
export function EmailRow({
  item,
  isSelected,
  isDimmed,
  filters,
  onSelect,
  onApprove,
  onDeny,
  onUndo,
  onRetriage,
  onFiltersChange
}: EmailRowProps) {
  const { email, decision, status, pendingApproval } = item;
  const { copy } = useCopyToClipboard();

  const undoableAction = item.actions.find(isUndoableAction) ?? null;
  const project = projectOf(email.subject);

  const copyValue = (value: string, label: string) => {
    void copy(value).then((ok) => {
      if (ok) {
        toast(`Copied ${label}`);
      }
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Item
            aria-current={isSelected}
            className={cn(
              'cursor-pointer rounded-none border-0 px-4 py-3.5 sm:px-6',
              'hover:bg-muted/60',
              isDimmed && !isSelected && 'opacity-55',
              isSelected && 'bg-primary/5'
            )}
            data-email-id={email.id}
            onClick={() => onSelect(email.id)}
          />
        }
      >
        <ItemContent className="min-w-0 gap-0.5">
          <ItemTitle className="w-full justify-between gap-3 font-semibold">
            <span className="min-w-0 truncate">{email.subject}</span>
            <span className="shrink-0 font-normal text-muted-foreground text-xs tabular-nums">
              {formatTimestamp(email.timestamp)}
            </span>
          </ItemTitle>
          <p className="truncate text-muted-foreground text-xs">
            {senderName(email.from)}
          </p>
          <ItemDescription className="line-clamp-1">
            <PreviewMarkdown>
              {decision?.whyPreview ?? email.body}
            </PreviewMarkdown>
          </ItemDescription>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {decision ? (
                <>
                  <Badge variant={statusBadgeVariant(status)}>
                    {STATUS_LABELS[status]}
                  </Badge>
                  <Badge variant={severityBadgeVariant(decision.severity)}>
                    {decision.severity}
                  </Badge>
                </>
              ) : (
                <Badge variant="outline">Not triaged</Badge>
              )}
            </div>
            {pendingApproval ? (
              <ItemActions className="ml-auto shrink-0 gap-1.5">
                <Button
                  onClick={(event) => {
                    event.stopPropagation();
                    onApprove(pendingApproval.id);
                  }}
                  size="xs"
                  variant="secondary"
                >
                  <CheckIcon />
                  Approve
                </Button>
                <Button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeny(pendingApproval.id);
                  }}
                  size="xs"
                  variant="destructive"
                >
                  <BanIcon />
                  Deny
                </Button>
              </ItemActions>
            ) : null}
          </div>
        </ItemContent>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {pendingApproval ? (
          <>
            <ContextMenuItem onClick={() => onApprove(pendingApproval.id)}>
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
        {decision ? (
          <>
            <ContextMenuItem onClick={() => onRetriage(email.id)}>
              <RefreshCwIcon />
              Re-triage
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ListFilterIcon />
            Filter by
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {decision ? (
              <ContextMenuItem
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    severity: decision.severity
                  })
                }
              >
                Severity: {decision.severity}
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem
              onClick={() => onFiltersChange({ ...filters, project })}
            >
              Project: {project}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => copyValue(email.subject, 'subject')}>
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
  );
}
