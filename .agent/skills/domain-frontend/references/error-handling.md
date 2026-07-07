# Error Handling

How frontend errors reach the reviewer. Never silently return on a failed action.

## The Rule

Every user-triggered failure is visible where the user is working: inline row/panel error, page-level error state, or toast. Empty `catch` blocks and swallowed rejected promises are bugs.

## Surface Choice

| Scope | Surface |
| --- | --- |
| Loading the main inbox/audit data failed | Early-return page/panel error state |
| A row action failed | Inline row/detail error near the action when possible |
| A global one-off action failed | Toast or visible banner |
| Chat turn failed | Chat error row inside the thread |
| Field validation failed | `form.setError` / inline form message |

## Fetch Errors

Client seams should throw readable `Error` instances:

```tsx
const response = await fetch('/api/v1/inbox');
if (!response.ok) {
  const message = await response.text().catch(() => response.statusText);
  throw new Error(message || `HTTP ${response.status}`);
}
```

Render the message only if it is safe and user-readable. Otherwise map it to product copy such as `Could not undo this action. Try again.`

## Chat Errors

Chat status errors render inside `apps/web/src/components/chat/panel.tsx` so the failed turn is visible in context:

```tsx
if (status.type === 'error') {
  return <span>{status.error.message || 'Something went wrong. Try again.'}</span>;
}
```

## Anti-Patterns

| Anti-pattern | Do instead |
| --- | --- |
| `catch {}` | Render or toast the error |
| `if (!response.ok) return` | Throw a readable error from the client seam |
| Rendering backend tags directly | Map to human copy |
| Success toast with no failure path | Pair the action with an error surface |

## Key Files

- `apps/web/src/lib/inbox/client.ts` — readable HTTP/SSE errors
- `apps/web/src/lib/chat/http-transport.ts` — chat transport errors
- `apps/web/src/components/chat/panel.tsx` — chat error row
- `apps/web/src/components/inbox/inbox-shell.tsx` — inbox action surfaces
