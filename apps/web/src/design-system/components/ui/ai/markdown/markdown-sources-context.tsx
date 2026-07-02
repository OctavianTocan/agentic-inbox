"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";

export type MarkdownSourcesContextValue = {
  /** Called by a markdown link as it mounts. Idempotent for the same URL. */
  register: (href: string) => void;
  /** Called from the link's effect cleanup; removes when ref count hits zero. */
  unregister: (href: string) => void;
  /** Unique URLs in registration order. */
  links: readonly string[];
};

const MarkdownSourcesContext =
  createContext<MarkdownSourcesContextValue | null>(null);

/**
 * Collects URLs rendered by markdown anchors (via `LinkPreviewAnchor`)
 * so a sibling consumer (e.g. a sources footer) can read them without
 * re-parsing the markdown text. Anchors register on mount and unregister
 * on unmount; duplicates within the same subtree are ref-counted so a
 * single link rendered N times stays in the list until all instances
 * unmount.
 */
export function MarkdownSourcesProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );

  const register = useCallback((href: string) => {
    setCounts((prev) => {
      const next = new Map(prev);
      next.set(href, (next.get(href) ?? 0) + 1);
      return next;
    });
  }, []);

  const unregister = useCallback((href: string) => {
    setCounts((prev) => {
      const cur = prev.get(href) ?? 0;
      const next = new Map(prev);
      if (cur <= 1) {
        next.delete(href);
      } else {
        next.set(href, cur - 1);
      }
      return next;
    });
  }, []);

  const links = useMemo(() => Array.from(counts.keys()), [counts]);

  const value = useMemo<MarkdownSourcesContextValue>(
    () => ({ register, unregister, links }),
    [register, unregister, links],
  );

  return (
    <MarkdownSourcesContext.Provider value={value}>
      {children}
    </MarkdownSourcesContext.Provider>
  );
}

/**
 * Returns the active `MarkdownSourcesContextValue` or `null` when a
 * markdown subtree is rendered outside any provider (in which case
 * registration is a no-op for the link).
 */
export function useMarkdownSources(): MarkdownSourcesContextValue | null {
  return use(MarkdownSourcesContext);
}
