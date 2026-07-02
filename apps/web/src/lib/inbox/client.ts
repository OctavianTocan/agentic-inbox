import type { ApprovalVerdict, Inbox } from './types';

/** Inputs for resolving a pending approval on a sensitive email. */
export type ResolveApprovalInput = {
  readonly verdict: ApprovalVerdict;
  /** Edited reply body to send instead of the agent draft when approving. */
  readonly editedBody?: string;
};

/** Thin data seam between the inbox UI and the backend API. */
export type InboxClient = {
  /** Fetch the current inbox snapshot: summary plus joined items. */
  getInbox: () => Promise<Inbox>;
  /** Approve or deny a pending sensitive action and return the updated inbox. */
  resolveApproval: (
    approvalId: string,
    input: ResolveApprovalInput
  ) => Promise<Inbox>;
  /** Undo a previously executed action and return the updated inbox. */
  undoAction: (ledgerEntryId: string, emailId: string) => Promise<Inbox>;
};

const API_PREFIX = '/api/v1';

/** Reads an HTTP response body when possible, falling back to status text. */
async function responseMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  return body || response.statusText || `HTTP ${response.status}`;
}

/** Throws a readable error when an API response failed. */
async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }
  throw new Error(await responseMessage(response));
}

/** Reads the joined inbox snapshot from the API. */
async function fetchInbox(): Promise<Inbox> {
  const response = await fetch(`${API_PREFIX}/inbox`);
  await assertOk(response);
  return response.json();
}

/** Posts JSON to an API endpoint that returns no client-needed body. */
async function postJson(path: string, body?: unknown): Promise<void> {
  const init =
    body === undefined
      ? { method: 'POST' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        };
  const response = await fetch(`${API_PREFIX}${path}`, init);
  await assertOk(response);
}

/** HTTP client backed by the Effect API. */
function createHttpInboxClient(): InboxClient {
  return {
    getInbox: fetchInbox,
    resolveApproval: async (approvalId, input) => {
      await postJson(`/approvals/${encodeURIComponent(approvalId)}`, input);
      return fetchInbox();
    },
    undoAction: async (ledgerEntryId) => {
      await postJson(`/actions/${encodeURIComponent(ledgerEntryId)}/undo`);
      return fetchInbox();
    }
  };
}

/** Shared API client instance for the inbox UI. */
export const inboxClient: InboxClient = createHttpInboxClient();
