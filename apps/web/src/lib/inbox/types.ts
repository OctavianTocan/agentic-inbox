/**
 * Frontend mirrors of the `@app/api-core` inbox domain shapes. These stay in
 * sync with `packages/api-core/src/Modules/{Emails,Triage,Actions}/Domain.ts`
 * so the mock client and the wave-3 HTTP client are interchangeable behind
 * `InboxClient`.
 */

export type EmailStatus = 'needs_attention' | 'done_for_you' | 'filed';

export type Category =
  | 'rfi'
  | 'daily_report'
  | 'submittal'
  | 'vendor_quote'
  | 'schedule'
  | 'status_update'
  | 'change_order'
  | 'claim_dispute'
  | 'safety'
  | 'owner_escalation'
  | 'other';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Actor = 'batch_agent' | 'chat_agent' | 'user';

export type ActionKind = 'send_reply' | 'archive' | 'flag_for_review' | 'undo';

export type ApprovalVerdict = 'approve' | 'deny';

/** A single email from the static AEC inbox dataset. */
export type Email = {
  readonly id: string;
  readonly from: string;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly subject: string;
  readonly body: string;
  readonly timestamp: string;
  readonly inReplyTo: string | null;
};

/** The agent's structured verdict for a single email. */
export type Decision = {
  readonly emailId: string;
  readonly category: Category;
  readonly severity: Severity;
  readonly confidence: number;
  readonly whyPreview: string;
  readonly rationale: string;
  readonly keyFacts: readonly string[];
  readonly isSensitive: boolean;
};

/** An append-only record of one executed action, shown in the agent trace. */
export type LedgerEntry = {
  readonly id: string;
  readonly actor: Actor;
  readonly emailId: string;
  readonly action: ActionKind;
  readonly summary: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly undoneBy: string | null;
  readonly undoes: string | null;
  readonly createdAt: string;
};

/** A sensitive action paused awaiting human approval. */
export type ApprovalRequest = {
  readonly id: string;
  readonly emailId: string;
  readonly action: ActionKind;
  readonly summary: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

/** An email joined with its triage decision, status, and pending state. */
export type InboxItem = {
  readonly email: Email;
  readonly status: EmailStatus;
  readonly decision: Decision | null;
  readonly pendingApproval: ApprovalRequest | null;
  readonly actions: readonly LedgerEntry[];
};

/** Roll-up counts across the whole inbox for the summary block. */
export type InboxSummary = {
  readonly processed: number;
  readonly handled: number;
  readonly needsAttention: number;
  readonly filed: number;
};

/** Full inbox payload: summary plus the joined item list. */
export type Inbox = {
  readonly summary: InboxSummary;
  readonly items: readonly InboxItem[];
};

/** Browser-facing subset of events emitted while the batch triage agent runs. */
export type TriageRunEvent =
  | {
      readonly type: 'started';
      readonly emailId: string;
    }
  | {
      readonly type: 'decision';
      readonly emailId: string;
    }
  | {
      readonly type: 'action';
      readonly emailId: string;
      readonly summary: string;
    }
  | {
      readonly type: 'approval_pending';
      readonly emailId: string;
      readonly summary: string;
    }
  | {
      readonly type: 'failed';
      readonly emailId: string;
      readonly reason: string;
    }
  | {
      readonly type: 'done';
      readonly processed: number;
    };
