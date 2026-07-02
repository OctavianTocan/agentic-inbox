import { createContext } from "react";

/** Image-optimiser configuration shared through React context. */
export type ImageOptimiserConfig = {
  /** Optimiser endpoint path: `/_next/image` for Next.js or `/_vercel/image` for non-Next Vercel deployments. */
  readonly endpoint: string;
  /**
   * Hostnames eligible for optimisation. Supports exact matches and a
   * leading `**.` wildcard that covers the bare domain plus any subdomain
   * (e.g. `**.example.com` matches `example.com` and `api.example.com`).
   */
  readonly hosts: readonly string[];
  /** JPEG/WebP quality passed as the `q` query param; defaults to 75. */
  readonly quality?: number;
};

/** React context for the image-optimiser configuration. */
export const ImageOptimiserContext = createContext<ImageOptimiserConfig | null>(
  null,
);
