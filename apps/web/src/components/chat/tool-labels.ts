/** In-flight labels shown while each agent tool runs, keyed by tool name. */
export const TOOL_LABELS: Readonly<Record<string, string>> = {
  search_emails: 'Searching emails…',
  get_email: 'Reading email…',
  undo_action: 'Undoing action…',
  send_reply: 'Drafting reply…',
  approve: 'Approving…'
};

/** Draft-bearing tools whose output the inbox bridge can pick up. */
export const DRAFT_TOOL_NAMES: ReadonlySet<string> = new Set([
  'send_reply',
  'draft'
]);
