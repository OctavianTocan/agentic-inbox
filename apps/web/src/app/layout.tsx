import type { Metadata } from 'next';
import { DemoModeSticker } from '@/components/demo-mode-sticker';
import { ReactGrabSetup } from '@/components/dev/react-grab';
import { siteConfig } from '@/config/site';
import { fonts } from '@/design-system/lib/fonts';
import { DesignSystemProvider } from '@/design-system/providers';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '64x64' },
      { url: '/app-icon.svg', type: 'image/svg+xml' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  }
};

/** Read env at runtime (dynamic key — avoids Next build-time inlining). */
function envValue(name: string): string {
  return process.env[name]?.trim() ?? '';
}

/** True when either live dependency is missing (same rule as the API demo path). */
function isDemoMode(): boolean {
  return (
    envValue('DATABASE_URL').length === 0 ||
    envValue('OPENROUTER_API_KEY').length === 0
  );
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const demoMode = isDemoMode();
  return (
    <html className={fonts} lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <DesignSystemProvider>
          {process.env.NODE_ENV === 'development' ? <ReactGrabSetup /> : null}
          {children}
          {demoMode ? <DemoModeSticker /> : null}
        </DesignSystemProvider>
      </body>
    </html>
  );
}
