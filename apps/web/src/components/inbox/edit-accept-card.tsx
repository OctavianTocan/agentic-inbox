'use client';

import { useEffect, useState } from 'react';
import {
  BanIcon,
  CheckIcon,
  RotateCcwIcon
} from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/design-system/components/ui/card';
import { Textarea } from '@/design-system/components/ui/textarea';
import type { ApprovalRequest } from '@/lib/inbox/types';

type EditAcceptCardProps = {
  readonly approval: ApprovalRequest;
  readonly onApprove: (approvalId: string, editedBody?: string) => void;
  readonly onDeny: (approvalId: string) => void;
};

/** The draft reply body proposed in an approval payload, if present. */
function draftBody(approval: ApprovalRequest): string {
  return typeof approval.payload.body === 'string' ? approval.payload.body : '';
}

/**
 * Merged edit-and-approve card for a pending sensitive action. The primary
 * button label flips between "Accept" and "Submit edited" as the reviewer
 * edits the draft; reset restores the agent's original text.
 *
 * @param approval - The pending approval carrying the proposed draft.
 * @param onApprove - Called with the approval id and the final body to send.
 * @param onDeny - Called with the approval id to reject the action.
 * @returns The edit/accept card.
 */
export function EditAcceptCard({
  approval,
  onApprove,
  onDeny
}: EditAcceptCardProps) {
  const original = draftBody(approval);
  const [body, setBody] = useState(original);

  useEffect(() => {
    setBody(original);
  }, [original]);

  const isEdited = body.trim() !== original.trim();

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm">
          Proposed action — {approval.summary}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          className="min-h-40 font-mono text-sm"
          onChange={(event) => setBody(event.target.value)}
          value={body}
        />
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onApprove(approval.id, isEdited ? body : undefined)}
            size="sm"
          >
            <CheckIcon />
            {isEdited ? 'Submit edited' : 'Accept'}
          </Button>
          <Button
            onClick={() => onDeny(approval.id)}
            size="sm"
            variant="destructive"
          >
            <BanIcon />
            Deny
          </Button>
        </div>
        {isEdited ? (
          <Button onClick={() => setBody(original)} size="sm" variant="ghost">
            <RotateCcwIcon />
            Reset to original
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
