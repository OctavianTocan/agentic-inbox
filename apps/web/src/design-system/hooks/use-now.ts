"use client";

import { type DependencyList, useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 5000;

/**
 * Returns a `Date` that updates on a fixed interval, triggering a
 * re-render of the calling component each tick. Use to keep
 * relative-time displays (e.g. "5m ago") fresh without external
 * orchestration.
 *
 * Optionally accepts a `deps` list with the same semantics as
 * `useEffect`'s dependency array: whenever any dependency changes
 * (e.g. a `session.updatedAt` arriving via sync), `now` is refreshed
 * immediately and the tick interval restarts. This avoids stale
 * "in Xs" labels when an upstream timestamp jumps ahead of the cached
 * value.
 *
 * @param deps - Values that should force `now` to refresh when they change.
 * @param intervalMs - Tick interval in milliseconds. Defaults to 5s.
 */
export function useNow(
  deps: DependencyList = [],
  intervalMs: number = DEFAULT_INTERVAL_MS,
): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, ...deps]);

  return now;
}
