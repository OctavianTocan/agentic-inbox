"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const minScale = 0.1;
const maxScale = 8;
const doubleClickZoomStep = 1.75;
const zoomStep = 1.18;
const viewportInset = 48;

type Point = {
  x: number;
  y: number;
};

type Transform = {
  scale: number;
  x: number;
  y: number;
};

type ViewMode = "actual" | "custom" | "fit";

export type MarkdownMediaContentSize = {
  width: number;
  height: number;
};

type UseMarkdownMediaTransformOptions = {
  contentSize?: MarkdownMediaContentSize | undefined;
  open: boolean;
  /**
   * Upper bound on the auto-computed fit scale. Defaults to unbounded (caps
   * at the global `maxScale`), which is correct for resolution-independent
   * media (SVG/mermaid). Pass `1` for raster media so small images aren't
   * upscaled into a pixelated blob.
   */
  maxFitScale?: number | undefined;
};

type MarkdownMediaTransformControls = {
  handleDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleToggleFit: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  isInteracting: boolean;
  transform: Transform;
  viewMode: ViewMode;
  viewportRef: RefObject<HTMLDivElement | null>;
};

const identityTransform: Transform = { scale: 1, x: 0, y: 0 };

/** Constrains a value to the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Euclidean distance between two points. */
function getDistance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

/** Midpoint between two points. */
function getMidpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

/** Scale that fits the content within the viewport, capped at `maxFitScale`. */
function getFitScale(
  viewport: HTMLDivElement | null,
  contentSize: MarkdownMediaContentSize | undefined,
  maxFitScale: number,
): number {
  if (!viewport || !contentSize) {
    return 1;
  }

  if (contentSize.width <= 0 || contentSize.height <= 0) {
    return 1;
  }

  // `clientWidth`/`clientHeight` ignore CSS transforms; `getBoundingClientRect`
  // would read the dialog's `zoom-in-95` open animation mid-flight (~95% of
  // final size) and yield a slightly under-fit scale on first open.
  const availableWidth = Math.max(viewport.clientWidth - viewportInset, 1);
  const availableHeight = Math.max(viewport.clientHeight - viewportInset, 1);
  const scale = Math.min(
    maxFitScale,
    availableWidth / contentSize.width,
    availableHeight / contentSize.height,
  );

  return clamp(scale, minScale, maxScale);
}

/** Normalizes a wheel event into a pixel delta across deltaMode units. */
function getWheelDelta(event: WheelEvent): number {
  const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
  return event.deltaMode === 1 ? delta * 16 : delta;
}

/** Computes a transform that keeps a screen anchor fixed while rescaling. */
function getAnchoredTransform(options: {
  anchor: Point;
  nextScale: number;
  previous: Transform;
  sourceAnchor?: Point;
  viewport: HTMLDivElement | null;
}): Transform {
  const {
    anchor,
    nextScale,
    previous,
    sourceAnchor = anchor,
    viewport,
  } = options;

  if (!viewport) {
    return { ...previous, scale: nextScale };
  }

  const bounds = viewport.getBoundingClientRect();
  const originX = anchor.x - bounds.left - bounds.width / 2;
  const originY = anchor.y - bounds.top - bounds.height / 2;
  const sourceOriginX = sourceAnchor.x - bounds.left - bounds.width / 2;
  const sourceOriginY = sourceAnchor.y - bounds.top - bounds.height / 2;
  const contentX = (sourceOriginX - previous.x) / previous.scale;
  const contentY = (sourceOriginY - previous.y) / previous.scale;

  return {
    scale: nextScale,
    x: originX - contentX * nextScale,
    y: originY - contentY * nextScale,
  };
}

/**
 * Provides pan, pinch, and zoom transform state for a media viewport.
 *
 * @param options - Viewer configuration.
 * @param options.contentSize - Intrinsic media size used to compute the fit scale.
 * @param options.open - Whether the viewer is open; transform resets to fit on open.
 * @param options.maxFitScale - Upper bound on the auto-computed fit scale.
 * @returns Transform state plus pointer, wheel, and zoom handlers and a viewport ref.
 */
export function useMarkdownMediaTransform({
  contentSize,
  open,
  maxFitScale = Number.POSITIVE_INFINITY,
}: UseMarkdownMediaTransformOptions): MarkdownMediaTransformControls {
  const contentWidth = contentSize?.width;
  const contentHeight = contentSize?.height;
  const [transform, setTransform] = useState<Transform>(identityTransform);
  const [viewMode, setViewMode] = useState<ViewMode>("fit");
  const [isInteracting, setIsInteracting] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const activePointersRef = useRef(new Map<number, Point>());
  const dragOriginRef = useRef<Point | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    midpoint: Point;
    transform: Transform;
  } | null>(null);
  const wheelEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyViewMode = useCallback(
    (nextMode: Exclude<ViewMode, "custom">) => {
      const measuredContentSize =
        contentWidth === undefined || contentHeight === undefined
          ? undefined
          : { width: contentWidth, height: contentHeight };
      const scale =
        nextMode === "fit"
          ? getFitScale(viewportRef.current, measuredContentSize, maxFitScale)
          : 1;
      setViewMode(nextMode);
      setTransform({ scale, x: 0, y: 0 });
    },
    [contentHeight, contentWidth, maxFitScale],
  );

  const clearWheelEndTimeout = useCallback(() => {
    if (!wheelEndTimeoutRef.current) {
      return;
    }

    clearTimeout(wheelEndTimeoutRef.current);
    wheelEndTimeoutRef.current = null;
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      clearWheelEndTimeout();
      setIsInteracting(false);
      return;
    }

    applyViewMode("fit");
    activePointersRef.current.clear();
    dragOriginRef.current = null;
    pinchStartRef.current = null;
    setIsInteracting(false);
  }, [applyViewMode, clearWheelEndTimeout, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (viewMode === "custom") {
        return;
      }
      applyViewMode(viewMode);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [applyViewMode, open, viewMode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const delta = getWheelDelta(event);
      if (delta === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsInteracting(true);
      clearWheelEndTimeout();
      wheelEndTimeoutRef.current = setTimeout(() => {
        setIsInteracting(false);
        wheelEndTimeoutRef.current = null;
      }, 120);
      const factor = Math.exp(-delta * 0.002);
      setViewMode("custom");
      setTransform((previous) => {
        const nextScale = clamp(previous.scale * factor, minScale, maxScale);
        return getAnchoredTransform({
          anchor: { x: event.clientX, y: event.clientY },
          nextScale,
          previous,
          viewport,
        });
      });
    };

    viewport.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      viewport.removeEventListener("wheel", handleWheel, true);
      clearWheelEndTimeout();
    };
  }, [clearWheelEndTimeout, open]);

  const zoomToScale = useCallback((nextScale: number, anchor?: Point) => {
    setViewMode("custom");
    setTransform((previous) => {
      const scale = clamp(nextScale, minScale, maxScale);
      if (!anchor) {
        return { ...previous, scale };
      }
      return getAnchoredTransform({
        anchor,
        nextScale: scale,
        previous,
        viewport: viewportRef.current,
      });
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    zoomToScale(transform.scale / zoomStep);
  }, [transform.scale, zoomToScale]);

  const handleZoomIn = useCallback(() => {
    zoomToScale(transform.scale * zoomStep);
  }, [transform.scale, zoomToScale]);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // Double-click while at fit (any computed fit scale, including > 1x for
      // SVG that fills the viewport) toggles to actual size; otherwise zoom in.
      const nextScale = event.shiftKey
        ? transform.scale / doubleClickZoomStep
        : viewMode === "fit"
          ? 1
          : transform.scale * doubleClickZoomStep;
      zoomToScale(nextScale, { x: event.clientX, y: event.clientY });
    },
    [transform.scale, viewMode, zoomToScale],
  );

  const handleToggleFit = useCallback(() => {
    applyViewMode(viewMode === "fit" ? "actual" : "fit");
  }, [applyViewMode, viewMode]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      const point = { x: event.clientX, y: event.clientY };
      activePointersRef.current.set(event.pointerId, point);
      const points = Array.from(activePointersRef.current.values());

      if (points.length === 1) {
        dragOriginRef.current = point;
        setIsInteracting(true);
        return;
      }

      const first = points.at(0);
      const second = points.at(1);
      if (!first || !second) {
        return;
      }

      pinchStartRef.current = {
        distance: getDistance(first, second),
        midpoint: getMidpoint(first, second),
        transform,
      };
      dragOriginRef.current = null;
      setIsInteracting(true);
    },
    [transform],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activePointersRef.current.has(event.pointerId)) {
        return;
      }

      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      const points = Array.from(activePointersRef.current.values());

      if (points.length >= 2) {
        const first = points.at(0);
        const second = points.at(1);
        const pinchStart = pinchStartRef.current;
        if (!first || !second || !pinchStart || pinchStart.distance === 0) {
          return;
        }

        const distance = getDistance(first, second);
        const midpoint = getMidpoint(first, second);
        const nextScale = clamp(
          pinchStart.transform.scale * (distance / pinchStart.distance),
          minScale,
          maxScale,
        );
        setViewMode("custom");
        setTransform(
          getAnchoredTransform({
            anchor: midpoint,
            nextScale,
            previous: pinchStart.transform,
            sourceAnchor: pinchStart.midpoint,
            viewport: viewportRef.current,
          }),
        );
        return;
      }

      const origin = dragOriginRef.current;
      if (!origin) {
        return;
      }

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      dragOriginRef.current = { x: event.clientX, y: event.clientY };
      setViewMode("custom");
      setTransform((previous) => ({
        ...previous,
        x: previous.x + dx,
        y: previous.y + dy,
      }));
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      activePointersRef.current.delete(event.pointerId);
      pinchStartRef.current = null;
      const remaining = Array.from(activePointersRef.current.values()).at(0);

      if (remaining) {
        dragOriginRef.current = remaining;
        setIsInteracting(true);
        return;
      }

      dragOriginRef.current = null;
      setIsInteracting(false);
    },
    [],
  );

  return {
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleToggleFit,
    handleZoomIn,
    handleZoomOut,
    isInteracting,
    transform,
    viewMode,
    viewportRef,
  };
}
