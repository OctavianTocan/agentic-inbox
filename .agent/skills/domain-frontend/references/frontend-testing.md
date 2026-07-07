# Frontend Testing

Testing patterns for the `apps/web` React/Next.js frontend.

## Current State

Frontend tests live under `apps/web/test` and run through the workspace Vitest command:

```bash
bun run test
```

Use targeted tests while iterating, then the workspace command before calling work complete.

## Test Location

Following `AGENTS.md` conventions:

- Tests live in `apps/web/test/`.
- File pattern: `*.test.ts` or `*.test.tsx`.
- Never co-locate tests with source files.
- Frontend test filenames mirror source filenames in kebab-case.

## Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeDefined();
  });
});
```

## Hook Testing

```tsx
import { renderHook } from '@testing-library/react';

describe('useMyHook', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });
});
```

## Mocking

Mock app-local modules by their `@/...` import path:

```tsx
import { vi } from 'vitest';

vi.mock('@/lib/inbox/client', () => ({
  createInboxClient: () => mockInboxClient,
}));
```

## What to Test

| Priority | What | How |
| --- | --- | --- |
| High | Sensitive/action policy display and reversibility | Component test with mocked inbox snapshots |
| High | Data transformation helpers | Unit tests with fixed email/action fixtures |
| Medium | Component rendering | `render` + semantic queries |
| Medium | User interactions | `@testing-library/user-event` |
| Low | Layout/styling | Browser/visual QA, not Vitest |

## What NOT to Test

- Don't test design-system primitives as if they were product logic.
- Don't test Next.js routing internals.
- Don't test simple prop passthrough components.
- Don't weaken tests around sensitive emails just to fit current UI behavior; sensitive mail must never be auto-actioned.
