"use client";

import { use } from "react";
import { ImageOptimiserContext } from "../providers/image-optimiser";

export type OptimisedImageSrc = {
  readonly src: string;
  readonly srcSet: string;
};

/**
 * Resolves an image source into optimiser `src`/`srcSet` for a target render width.
 *
 * @param src - Original image URL, or nullish for no image.
 * @param width - Intended display width in CSS pixels; the `srcSet` offers 1x and 2x.
 * @returns The optimised `src`/`srcSet`, the original URL passed through when optimisation does not apply, or null when `src` is nullish.
 */
export function useOptimisedImageSrc(
  src: string | null | undefined,
  width: number,
): OptimisedImageSrc | null {
  const config = use(ImageOptimiserContext);

  if (!src) {
    return null;
  }

  const passthrough: OptimisedImageSrc = { src, srcSet: src };
  if (
    !config ||
    process.env.NODE_ENV !== "production" ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return passthrough;
  }

  let hostname: string;
  try {
    hostname = new URL(src).hostname;
  } catch {
    return passthrough;
  }

  if (!config.hosts.some((pattern) => matchHost(pattern, hostname))) {
    return passthrough;
  }

  const quality = config.quality ?? 75;
  const at = (w: number) =>
    `${config.endpoint}?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
  return {
    src: at(width * 2),
    srcSet: `${at(width)} 1x, ${at(width * 2)} 2x`,
  };
}

/** Whether a hostname matches an allowlist pattern, supporting a leading `**.` wildcard. */
function matchHost(pattern: string, hostname: string): boolean {
  if (pattern.startsWith("**.")) {
    const bare = pattern.slice(3);
    return hostname === bare || hostname.endsWith(`.${bare}`);
  }
  return pattern === hostname;
}
