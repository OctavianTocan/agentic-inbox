"use client";

import { type ReactNode, useMemo } from "react";
import type { ImageOptimiserConfig } from "./image-optimiser-context";
import { ImageOptimiserContext } from "./image-optimiser-context";

export type { ImageOptimiserConfig } from "./image-optimiser-context";
export { ImageOptimiserContext } from "./image-optimiser-context";

/** Supplies image-optimiser configuration to descendants via React context. */
export function ImageOptimiserProvider({
  endpoint,
  hosts,
  quality,
  children,
}: ImageOptimiserConfig & { children: ReactNode }) {
  const value = useMemo(
    () => ({ endpoint, hosts, quality }),
    [endpoint, hosts, quality],
  );
  return (
    <ImageOptimiserContext.Provider value={value}>
      {children}
    </ImageOptimiserContext.Provider>
  );
}
