import type { NextConfig } from 'next';

const API_ORIGIN = trimTrailingSlash(
  process.env.COGRAM_API_ORIGIN ?? 'http://127.0.0.1:8001'
);

/** Removes a trailing slash so rewrite destinations compose predictably. */
function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'openclaw-vps.tailb0501a.ts.net'],
  devIndicators: false,
  /** Proxies same-origin browser API calls to the Effect backend. */
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_ORIGIN}/api/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
