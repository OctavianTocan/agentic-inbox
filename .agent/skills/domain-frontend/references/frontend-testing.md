# Frontend Testing

Testing patterns for React components and hooks.

## Current State

Frontend tests are minimal — the codebase is backend-heavy with 120+ Effect-TS test files. `@tooling/testing` ships a jsdom + React vitest config ready for use.

## Vitest Config

Frontend packages use the shared config with jsdom:

```typescript
// vitest.config.ts
import sharedConfig from '@tooling/testing';
import { mergeConfig, defineConfig } from 'vitest/config';

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
}));
```

## Test Location

Following AGENTS.md conventions:
- Tests live in `test/` directory at package level
- File pattern: `test/**/*.test.ts` or `test/**/*.test.tsx`
- Never co-located with source files

## Test File Naming

Frontend packages: test filenames mirror their source filename casing (kebab-case `feature-name.test.tsx` for a kebab `feature-name.tsx` source). Effect-TS backend packages use PascalCase test filenames (see `domain-effect/references/code-style.md`); the test directory is **not** a monorepo-wide PascalCase island.

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

```tsx
import { vi } from 'vitest';

// Mock a module
vi.mock('@platform/auth/hooks', () => ({
  useSession: () => ({ data: mockSession, isPending: false }),
}));
```

## What to Test

| Priority | What | How |
|----------|------|-----|
| High | Data transformation hooks | `renderHook` + assertions |
| High | Form validation logic | Unit test schemas directly |
| Medium | Component rendering | `render` + `screen.getByText` |
| Medium | User interactions | `@testing-library/user-event` |
| Low | Layout/styling | Visual regression (not in vitest) |

## What NOT to Test

- Don't test shadcn/ui components — they're maintained upstream
- Don't test TanStack Router navigation — integration concern
- Don't test React Query caching — trust the library
- Don't test simple prop passthrough components
