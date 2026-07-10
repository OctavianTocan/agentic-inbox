# Next.js Patterns

Patterns for `apps/web`, the Next.js 16 App Router frontend for Agentic Inbox.

## Current Shape

- One Next.js app: `apps/web`.
- Route files live under `apps/web/src/app`.
- Product UI lives under `apps/web/src/components`.
- App-local design-system primitives live under `apps/web/src/design-system`.
- Headless AI chat primitives live under `apps/web/src/ai-ui`.

## Root Layout

`apps/web/src/app/layout.tsx` owns metadata, fonts, global colors, and `DesignSystemProvider`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fonts} lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <DesignSystemProvider>{children}</DesignSystemProvider>
      </body>
    </html>
  );
}
```

Keep app-wide providers here only when every route needs them. Feature-specific providers belong in the feature shell.

## Route Files

Route files should stay small:

```tsx
import { cookies } from 'next/headers';
import { InboxShell } from '@/components/inbox/inbox-shell';

export default async function InboxPage() {
  const cookieStore = await cookies();
  const persistedWidth = parseWidthCookie(cookieStore.get(SIDEBAR_WIDTH_COOKIE_NAME)?.value, 264, 220, 360);
  return <InboxShell persistedWidth={persistedWidth} />;
}
```

Use server components by default. Push `'use client'` into product components that need browser state or interactions.

## Metadata

Use the Next `Metadata` type in route/layout files:

```tsx
export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};
```

## API Routes and Backend Calls

- Browser UI calls `/api/v1/...` through web-local clients under `apps/web/src/lib`.
- Shared HTTP schemas belong in `packages/api-core`.
- Effect backend handlers live in `apps/api`.
- Web API route files should proxy/adapt, not duplicate backend policy.

## Anti-Patterns

- Don't put large product UI directly in `app/*/page.tsx`.
- Don't use `'use client'` at the route level unless the whole route must be client-only.
- Don't import inbox/audit/chat code into `apps/web/src/design-system`.
- Don't bypass `packages/api-core` when adding a new backend-backed endpoint.
