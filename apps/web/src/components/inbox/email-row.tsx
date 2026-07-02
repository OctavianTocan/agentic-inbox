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
 * @param onSelect - Called with the email id when the row is activated.
 * @param onApprove - Called with the approval id to approve inline.
 * @param onDeny - Called with the approval id to deny inline.
 * @returns The list row.
 */
export function EmailRow({
  item,
  isSelected,
  onSelect,
  onApprove,
  onDeny
}: EmailRowProps) {
  const { email, decision, status, pendingApproval } = item;

  return (
    <Item
      aria-current={isSelected}
      className={cn(
        'cursor-pointer rounded-none border-0 px-6 py-3',
        isSelected && 'bg-muted'
      )}
      data-email-id={email.id}
      onClick={() => onSelect(email.id)}
    >
      <ItemContent>
        <ItemTitle className="w-full justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            {decision ? (
              <Badge variant={severityBadgeVariant(decision.severity)}>
                {decision.severity}
              </Badge>
            ) : null}
            <span className="truncate">{email.subject}</span>
          </span>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {formatTimestamp(email.timestamp)}
          </span>
        </ItemTitle>
        <ItemDescription className="line-clamp-1">
          {decision?.whyPreview ?? `From ${senderName(email.from)}`}
        </ItemDescription>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={statusBadgeVariant(status)}>
            {STATUS_LABELS[status]}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {senderName(email.from)}
          </span>
        </div>
      </ItemContent>
      {pendingApproval ? (
        <ItemActions>
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
