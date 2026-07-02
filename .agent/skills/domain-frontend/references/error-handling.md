# Error Handling

How server and auth errors reach the user. Toast, form field, or page state — never a silent return or empty catch.

## The Rule

Every mutation error is surfaced to the user. If a call returns an `error` field or throws, the code either toasts it, writes it to a form field, or renders a page-level error state. An empty `catch` or a bare `return;` on `result.error` is a bug.

## Where Should the Error Appear?

| Scope | Surface | Example |
|-------|---------|---------|
| Field-scoped (server validates a specific field, e.g. duplicate slug, email in use) | `form.setError(field, { message })` | `slug-field.tsx` |
| Action-scoped (user triggered an action that failed as a whole, e.g. create org, leave org, resend invite) | `toast.error(message)` | `organization-create-dialog.tsx` |
| Page-scoped (loading the primary resource failed) | Early-return error state in the page, not a toast | `page-anatomy.md` state branching |

## Better-Auth Client Errors

Better-auth mutations return `{ data, error }` instead of throwing. The error shape is `{ message?: string }` — no discriminating code. Always read `error.message` with a fallback:

```tsx
const result = await authClient.organization.create({ name, slug });
if (result.error) {
  toast.error(result.error.message ?? 'Failed to create organization.');
  return;
}
```

Inside `packages/comcom/app-core`, use `toastAuthError` from `lib/auth-errors.ts` — it handles the narrowing:

```tsx
import { toastAuthError } from '@comcom/app-core/lib/auth-errors';

if (result.error) {
  toastAuthError(result.error, 'Failed to create organization.');
  return;
}
```

Inside `packages/platform/auth`, `toastAuthError` is not importable (layering — auth sits below app-core). Use `sonner.toast.error` directly.

Wrap the call in `try/catch` for unexpected throws (network, 5xx that bypasses better-auth's error wrapping):

```tsx
try {
  const result = await authClient.organization.create({ name, slug });
  // ...handle result.error and result.data
} catch (error) {
  toast.error(
    error instanceof Error ? error.message : 'Failed to create organization.'
  );
}
```

## React Query Mutations (Non-Auth)

Wire `onError: toastApiError` from `@comcom/app-shared/lib/api-errors`. It extracts the message from the API client's typed error response:

```tsx
useMutation({
  mutationFn: async (body) => {
    const { data } = await itemsCreate({ body, throwOnError: true });
    return data;
  },
  onError: toastApiError,
});
```

See [data-fetching.md](data-fetching.md) for the full mutation shape.

## Better-Auth + react-hook-form (Field-Level Errors)

When a better-auth error should land on a specific form field, throw inside `useMutation`'s `mutationFn` and map the message in `onError` with `getAuthErrorMessage`:

```tsx
const mutation = useMutation({
  mutationFn: async (input) => {
    const result = await authClient.organization.update(input);
    if (result.error) {
      throw result.error;
    }
    return result.data;
  },
  onError: (error) => {
    form.setError('slug', {
      message: getAuthErrorMessage(error, 'Failed to update.'),
    });
  },
});
```

Canonical usage: `packages/comcom/app-core/src/pages/security/components/add-passkey-dialog.tsx`.

## Effect HTTP API Errors

The generated API client surfaces tagged errors as `{ _tag, …payload }`. Pattern-match on `_tag` for user-visible copy — never render the raw tag:

```tsx
if (res.error) {
  const message =
    res.error._tag === 'OrganizationSlugTakenError'
      ? `Slug "${res.error.slug}" is already taken.`
      : 'Something went wrong.';
  toast.error(message);
  return;
}
```

## Anti-Patterns

| Anti-pattern | Why | Do instead |
|-------------|-----|------------|
| `if (result.error) { return; }` | Silent failure; user sees nothing. | Toast or form field. |
| `catch (_error) { /* no-op */ }` | Same. | Toast the error. |
| `toast.error(error._tag ?? 'Unknown error')` | Leaks internal tag names to users. | Pattern-match `_tag` to human copy. |
| `form.setError('slug', { message: error.message })` based on a message substring | Heuristic string match breaks when backend copy changes. | Only field-map when the backend returns a structured `code` identifying the field. |
| `onSuccess: () => toast.success(...)` with no `onError` | Success toasts alone; failures invisible. | Always pair with `onError: toastApiError` (or equivalent). |

## Helpers Quick Reference

| Helper | Location | Use for |
|--------|----------|---------|
| `toastApiError` | `packages/comcom/app-shared/src/lib/api-errors.ts` | React Query `onError` for API-client calls. |
| `toastAuthError` | `packages/comcom/app-core/src/lib/auth-errors.ts` | Better-auth `result.error` in app-core code. |
| `getAuthErrorMessage` | `packages/comcom/app-core/src/lib/auth-errors.ts` | Extract a user-facing message from a better-auth error (e.g. for `form.setError`). |

## Key Files

- `packages/platform/auth/src/components/blocks/organizations/organization-create-dialog.tsx` — toast on `result.error` + catch.
- `packages/comcom/app-core/src/pages/organization/components/slug-field.tsx` — field-level mapping via `form.setError`.
- `packages/comcom/app-core/src/hooks/use-organization-update.ts` — `toastAuthError` in a React Query mutation's `onError`.
