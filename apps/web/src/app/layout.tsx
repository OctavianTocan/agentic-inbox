import type { Metadata } from 'next';
import { ReactGrabSetup } from '@/components/dev/react-grab';
import { siteConfig } from '@/config/site';
import { fonts } from '@/design-system/lib/fonts';
import { DesignSystemProvider } from '@/design-system/providers';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={fonts} lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <DesignSystemProvider>
          {process.env.NODE_ENV === 'development' ? <ReactGrabSetup /> : null}
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
}
