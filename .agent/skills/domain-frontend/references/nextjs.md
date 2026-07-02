# Next.js Patterns

Patterns for `apps/web` (marketing site, port 3000) and `apps/admin` (admin dashboard, port 3008).

## Shared Config

Both apps extend `@ui/next-config`:

```typescript
// apps/admin/next.config.ts — simple passthrough
import { config } from '@ui/next-config';
export default config;

// apps/web/next.config.ts — with fumadocs MDX
import { createMDX } from 'fumadocs-mdx/next';
import { config } from '@ui/next-config';
const withMDX = createMDX();
export default withMDX(config);
```

## App Router Layout

### Marketing Site (apps/web)

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(fonts, 'antialiased')}>
        <AnalyticsProvider>
          <PostHogSessionIdentifier />
          <DesignSystemProvider>
            <Providers>{children}</Providers>
          </DesignSystemProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

Provider order: Analytics -> PostHog -> DesignSystem -> App-specific.

### Admin (apps/admin)

Minimal — no analytics, no design system provider:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={fonts}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Metadata

```tsx
export const metadata: Metadata = {
  title: { default: 'The Company Company', template: '%s | TCC' },
  description: '...',
  openGraph: { title: '...', description: '...', url: '...' },
  appleWebApp: { capable: true, statusBarStyle: 'default' },
};
```

## Fumadocs (Documentation)

`apps/web` uses fumadocs for API documentation:

- MDX pages in the docs directory
- OpenAPI spec integration
- Wraps Next.js config with `createMDX()`

## When to Use Next.js vs Vite

| Use case | Framework |
|----------|-----------|
| Marketing / public pages | Next.js (`apps/web`) |
| Admin dashboard | Next.js (`apps/admin`) |
| Main product dashboard | Vite + TanStack Router (`apps/app`) |
| Desktop app | Vite + TanStack Router (`apps/desktop`) |

Next.js apps are for content-heavy, SEO-relevant pages. The product app uses Vite for faster dev iteration and client-side routing.

## Anti-Patterns

- Don't add heavy client-side state to Next.js pages — these should be mostly server-rendered
- Don't duplicate `@ui/next-config` settings in individual apps
- Don't use `'use client'` at the page level — push it down to the smallest component that needs it
