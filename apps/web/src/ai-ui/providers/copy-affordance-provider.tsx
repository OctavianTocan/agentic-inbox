"use client";

import { createContext, type ReactNode, use } from "react";

const CopyAffordanceContext = createContext<boolean>(true);

export interface CopyAffordanceProviderProps {
  /** Whether copy affordances within this subtree may render. */
  enabled: boolean;
  children: ReactNode;
}

/** Gates copy affordances rendered by descendants (e.g. streamed markdown). */
export function CopyAffordanceProvider({
  enabled,
  children,
}: CopyAffordanceProviderProps) {
  return (
    <CopyAffordanceContext.Provider value={enabled}>
      {children}
    </CopyAffordanceContext.Provider>
  );
}

/**
 * Whether copy affordances may render in the current subtree.
 *
 * @returns `true` outside any provider (the default), or the nearest provider's
 *   `enabled` value — `false` while its message is still streaming.
 */
export function useCopyAffordanceEnabled(): boolean {
  return use(CopyAffordanceContext);
}
