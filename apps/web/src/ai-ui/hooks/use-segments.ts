"use client";

import type { ComponentType } from "react";
import { useMemo, useRef } from "react";
import type { ResolvedPart } from "../resolver";

type RawPart = ResolvedPart["part"];

const TOOL_PREFIX = "tool-";

/**
 * A segment is a group of resolved parts separated by boundary parts.
 * Boundaries are parts that split the message into logical sections
 * (e.g., agent-to-user messages splitting reasoning blocks).
 *
 * @typeParam TBoundary - The shape of data extracted from boundary parts.
 */
export interface Segment<TBoundary = unknown> {
  /** Resolved parts in this segment (tool calls, text, reasoning, etc.) */
  readonly parts: readonly ResolvedPart[];
  /** The boundary data that ended this segment, or null if this is the last/only segment */
  readonly boundary: TBoundary | null;
}

/**
 * Configuration for how message parts are split into segments.
 *
 * @typeParam TBoundary - The shape of data extracted from boundary parts.
 */
export interface SegmentsConfig<TBoundary = unknown> {
  /** All raw message parts from the UIMessage. */
  rawParts: readonly RawPart[];
  /** Parts that were resolved to components via the component resolver. */
  resolvedParts: readonly ResolvedPart[];
  /** Fallback component for unresolved tool parts. */
  fallback?: ComponentType | null;
  /** Part type that acts as a segment boundary (e.g., `'tool-SendUserMessage'`). */
  boundaryType: string;
  /**
   * Extract boundary data from a boundary part. Return `null` to treat this
   * occurrence as a non-boundary (the part will be skipped).
   *
   * Defaults to returning the raw part itself.
   */
  extractBoundary?: (part: RawPart) => TBoundary | null;
  /**
   * Part types to skip entirely (not included in any segment).
   * The `boundaryType` is always implicitly skipped from segment parts
   * regardless of this set.
   *
   * Defaults to `new Set(['step-start'])`.
   */
  skipTypes?: ReadonlySet<string>;
}

const DEFAULT_SKIP_TYPES: ReadonlySet<string> = new Set(["step-start"]);

/** True when a raw part type is an unresolved tool invocation eligible for fallback rendering. */
function isUnresolvedToolPart(
  type: string,
  skipTypes: ReadonlySet<string>,
  boundaryType: string,
): boolean {
  return (
    type.startsWith(TOOL_PREFIX) &&
    type !== boundaryType &&
    !skipTypes.has(type)
  );
}

/** Returns the resolved part for a raw part when it is the next expected match, else `null`. */
function tryMatchResolved(
  rawPart: RawPart,
  resolvedParts: readonly ResolvedPart[],
  resolvedIdx: number,
): ResolvedPart | null {
  const resolvedPart = resolvedParts[resolvedIdx];
  if (resolvedPart !== undefined && resolvedPart.part === rawPart) {
    return resolvedPart;
  }
  return null;
}

/** Merges a trailing boundary-less segment into its predecessor to avoid a dangling partial segment. */
function mergeTrailingSegment<TBoundary>(segments: Segment<TBoundary>[]): void {
  const last = segments.at(-1);
  if (segments.length <= 1 || !last || last.boundary !== null) {
    return;
  }
  segments.pop();
  if (last.parts.length > 0) {
    const prev = segments.at(-1);
    if (prev) {
      const merged: Segment<TBoundary> = {
        parts: [...prev.parts, ...last.parts],
        boundary: prev.boundary,
      };
      segments[segments.length - 1] = merged;
    }
  }
}

/**
 * Splits message parts into {@link Segment} objects at each boundary part.
 *
 * A trailing segment without a boundary is merged back into the previous
 * segment to avoid dangling partial segments.
 *
 * @typeParam TBoundary - The shape of data extracted from boundary parts.
 * @param config - Segmentation configuration.
 * @returns An array of segments derived from the raw parts.
 */
export function buildSegments<TBoundary = unknown>(
  config: SegmentsConfig<TBoundary>,
): Segment<TBoundary>[] {
  const {
    rawParts,
    resolvedParts,
    fallback = null,
    boundaryType,
    extractBoundary = (part: RawPart) => part as TBoundary,
    skipTypes = DEFAULT_SKIP_TYPES,
  } = config;

  const segments: Segment<TBoundary>[] = [];
  let currentParts: ResolvedPart[] = [];
  let resolvedIdx = 0;
  let partCounter = 0;

  for (const rawPart of rawParts) {
    if (rawPart.type === boundaryType) {
      const boundary = extractBoundary(rawPart);
      segments.push({
        parts: currentParts,
        boundary,
      });
      currentParts = [];
      continue;
    }

    if (skipTypes.has(rawPart.type)) {
      continue;
    }

    const matched = tryMatchResolved(rawPart, resolvedParts, resolvedIdx);
    if (matched) {
      currentParts.push(matched);
      resolvedIdx++;
      continue;
    }

    if (
      fallback &&
      isUnresolvedToolPart(rawPart.type, skipTypes, boundaryType)
    ) {
      currentParts.push({
        Component: fallback,
        part: rawPart,
        partKey: `fallback-${partCounter++}`,
        index: -1,
      });
    }
  }

  if (currentParts.length > 0 || segments.length === 0) {
    segments.push({
      parts: currentParts,
      boundary: null,
    });
  }

  mergeTrailingSegment(segments);

  return segments;
}

/**
 * Memoized {@link buildSegments}, recomputed when any config value changes.
 *
 * @typeParam TBoundary - The shape of data extracted from boundary parts.
 * @param config - Segmentation configuration.
 * @returns A memoized array of segments.
 */
export function useSegments<TBoundary = unknown>(
  config: SegmentsConfig<TBoundary>,
): Segment<TBoundary>[] {
  const {
    rawParts,
    resolvedParts,
    fallback,
    boundaryType,
    extractBoundary,
    skipTypes,
  } = config;

  return useMemo(() => {
    const nextConfig: SegmentsConfig<TBoundary> = {
      rawParts,
      resolvedParts,
      boundaryType,
      ...(fallback !== undefined && { fallback }),
      ...(extractBoundary !== undefined && { extractBoundary }),
      ...(skipTypes !== undefined && { skipTypes }),
    };
    return buildSegments(nextConfig);
  }, [
    rawParts,
    resolvedParts,
    fallback,
    boundaryType,
    extractBoundary,
    skipTypes,
  ]);
}

/**
 * Computes the elapsed time between consecutive completed segments. The first
 * completed segment, having no predecessor, reports a fixed 5-second duration.
 *
 * @typeParam TBoundary - The shape of boundary data in each segment.
 * @param segments - The segments to compute timings for.
 * @param hasBoundary - Predicate that returns `true` when a segment has
 *   a completed boundary (e.g., `segment => segment.boundary !== null`).
 * @returns A map from segment index to duration in milliseconds.
 */
export function useSegmentTimings<TBoundary>(
  segments: readonly Segment<TBoundary>[],
  hasBoundary: (segment: Segment<TBoundary>) => boolean,
): Map<number, number> {
  const timestampsRef = useRef<Map<number, number>>(new Map());

  return useMemo(() => {
    const now = Date.now();
    const timestamps = timestampsRef.current;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment !== undefined && hasBoundary(segment) && !timestamps.has(i)) {
        timestamps.set(i, now);
      }
    }

    const durations = new Map<number, number>();
    let prevTimestamp: number | null = null;

    for (let i = 0; i < segments.length; i++) {
      const ts = timestamps.get(i);
      if (ts !== undefined) {
        const start = prevTimestamp ?? ts - 5000;
        durations.set(i, ts - start);
        prevTimestamp = ts;
      }
    }

    return durations;
  }, [segments, hasBoundary]);
}
