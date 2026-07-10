import type { NextConfig } from 'next';

/**
 * Whether a module request should stay external so Bun resolves api `@/` paths.
 *
 * @param request - Bundler module request string.
 * @returns True when the request is the api workspace package or a subpath.
 */
function isApiWorkspaceRequest(request: string): boolean {
  return (
    request === '@apps/api' ||
    request.startsWith('@apps/api/') ||
    request === '@app/api-core' ||
    request.startsWith('@app/api-core/')
  );
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'openclaw-vps.tailb0501a.ts.net'],
  devIndicators: false,
  // Next 16 forbids a package in both transpilePackages and serverExternalPackages.
  // Keep the key for monorepo tooling; workspace API packages must stay off the
  // transpile list so they can be listed under serverExternalPackages.
  transpilePackages: [],
  // Keep @apps/api external on the server so Bun resolves apps/api tsconfig
  // paths (`@/*` → apps/api/src). Transpiling into the web graph would make
  // `@/` resolve to apps/web/src and break api imports.
  // Dataset lives in-package (emails.dataset.ts) so NFT does not need
  // repo-root data/emails.json when this package is external.
  // Note: Next often still traces workspace symlinks (vercel/next.js#84388);
  // webpack.externals below externalizes by request name. Prefer
  // `next build --webpack` until Turbopack honors workspace externals.
  // Web tsconfig also maps api-only `@/Lib|Modules|Infrastructure` prefixes
  // so Next's build typecheck and Turbopack tracing resolve correctly.
  serverExternalPackages: ['@apps/api', '@app/api-core'],
  // Keep local dotenv files out of serverless NFT traces. Bun auto-loads
  // `.env` when present in the function bundle, which would force live DB mode
  // on Vercel even with no dashboard env vars.
  outputFileTracingExcludes: {
    '*': ['.env', '.env.*', '../../.env', '../../.env.*']
  },
  // Empty turbopack config: Next 16 defaults to Turbopack and errors when a
  // webpack() hook exists without a turbopack key. Workspace externals still
  // need the webpack hook (request-name externalization); prefer
  // `next build --webpack` for production until Turbopack honors them.
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      return config;
    }
    const previous = config.externals;
    const previousList = Array.isArray(previous)
      ? previous
      : previous === undefined || previous === null
        ? []
        : [previous];
    config.externals = [
      ...previousList,
      (
        data: { request?: string },
        callback: (error?: Error | null, result?: string) => void
      ) => {
        if (
          typeof data.request === 'string' &&
          isApiWorkspaceRequest(data.request)
        ) {
          callback(undefined, `module ${data.request}`);
          return;
        }
        callback();
      }
    ];
    return config;
  }
};

export default nextConfig;
