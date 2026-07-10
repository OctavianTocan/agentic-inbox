import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'openclaw-vps.tailb0501a.ts.net'],
  devIndicators: false,
  transpilePackages: ['@apps/api', '@app/api-core'],
  // Keep @apps/api external on the server so Bun resolves apps/api tsconfig
  // paths (`@/*` → apps/api/src). Transpiling into the web graph would make
  // `@/` resolve to apps/web/src and break api imports.
  // Dataset lives in-package (emails.dataset.ts) so NFT does not need
  // repo-root data/emails.json when this package is external.
  serverExternalPackages: [
    '@apps/api',
    '@app/api-core',
    '@effect/sql-pg',
    '@effect/ai-openrouter',
    'effect'
  ]
};

export default nextConfig;
