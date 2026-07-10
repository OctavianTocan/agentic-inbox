# Data Fetching

How frontend code reads and writes data in this repository.

## Decision Rule

- Static inbox/domain transforms live under `apps/web/src/lib/{feature}`.
- Browser-facing API clients live under `apps/web/src/lib/{feature}` and call `/api/v1/...`.
- Shared request/response schemas and contracts live in `packages/api-core`.
- Durable backend behavior lives in `apps/api`; do not duplicate policy in the web app.

## Inbox API Client

The inbox UI talks through `apps/web/src/lib/inbox/client.ts`:

```tsx
const inbox = await inboxClient.getInbox();
const nextInbox = await inboxClient.undoAction(ledgerEntryId, emailId);
const updated = await inboxClient.resolveApproval(approvalId, {
  verdict: 'approved',
  editedBody,
});
```

Keep this seam thin. It should adapt transport details into typed UI shapes, not make triage/safety policy decisions.

## SSE Streams

Triage and chat stream over SSE. Parse stream events at the client seam and expose small typed events to components:

- `apps/web/src/lib/inbox/client.ts` maps triage SSE events to `TriageRunEvent`.
- `apps/web/src/lib/chat/http-transport.ts` maps chat SSE chunks to `ChatTransportEvent`.

Components should not parse raw SSE blocks.

## Error Handling

Fetch helpers should throw readable `Error` messages. Components then render inline errors or toasts depending on the surface.

```tsx
async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => '');
  throw new Error(body || response.statusText || `HTTP ${response.status}`);
}
```

## State Updates

For this static 80-email dataset, prefer replacing the current inbox snapshot with the returned snapshot after an action. Do not add a client cache layer unless repeated stale reads become observable.

## Key Files

- `apps/web/src/lib/inbox/client.ts` — inbox API/SSE seam
- `apps/web/src/lib/inbox/types.ts` — UI-facing inbox types
- `apps/web/src/lib/chat/http-transport.ts` — chat SSE transport
- `apps/web/src/lib/chat/adapter.ts` — transport-to-ai-ui adapter
- `packages/api-core/src` — shared API schemas/contracts
- `apps/api/src` — backend handlers and policies
