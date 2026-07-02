'use client';

import { BanIcon, CheckIcon } from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@/design-system/components/ui/item';
import { cn } from '@/design-system/lib/utils';
import {
  formatTimestamp,
  STATUS_LABELS,
  senderName,
  severityBadgeVariant,
  statusBadgeVariant
} from '@/lib/inbox/labels';
import type { InboxItem } from '@/lib/inbox/types';

type EmailRowProps = {
  readonly item: InboxItem;
  readonly isSelected: boolean;
  readonly isDimmed: boolean;
  readonly onSelect: (emailId: string) => void;
  readonly onApprove: (approvalId: string) => void;
  readonly onDeny: (approvalId: string) => void;
};

/**
 * One inbox list row: severity badge, subject, why-preview, status chip, and
 * timestamp. When an approval is pending it shows inline Approve/Deny buttons.
 *
 * @param item - The joined email, decision, status, and pending state.
 * @param isSelected - Whether this row is the open detail selection.
 * @param isDimmed - Whether the row has already been reviewed or handled.
 * @param onSelect - Called with the email id when the row is activated.
 * @param onApprove - Called with the approval id to approve inline.
 * @param onDeny - Called with the approval id to deny inline.
 * @returns The list row.
 */
export function EmailRow({
  item,
  isSelected,
  isDimmed,
  onSelect,
  onApprove,
  onDeny
}: EmailRowProps) {
  const { email, decision, status, pendingApproval } = item;

  return (
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
    >
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full justify-between gap-3">
          <span className="min-w-0 truncate">{senderName(email.from)}</span>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {formatTimestamp(email.timestamp)}
          </span>
        </ItemTitle>
        <div className="min-w-0 truncate font-medium text-sm">
          {email.subject}
        </div>
        <ItemDescription className="line-clamp-2">
          {decision?.whyPreview ?? email.body}
        </ItemDescription>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant={statusBadgeVariant(status)}>
            {STATUS_LABELS[status]}
          </Badge>
          {decision ? (
            <Badge variant={severityBadgeVariant(decision.severity)}>
              {decision.severity}
            </Badge>
          ) : null}
        </div>
      </ItemContent>
      {pendingApproval ? (
        <ItemActions className="max-sm:basis-full max-sm:justify-end max-sm:pl-5">
          <Button
            onClick={(event) => {
              event.stopPropagation();
              onApprove(pendingApproval.id);
            }}
            size="sm"
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
            size="sm"
            variant="destructive"
          >
            <BanIcon />
            Deny
          </Button>
        </ItemActions>
      ) : null}
    </Item>
  );
}
