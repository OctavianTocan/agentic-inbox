"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSidebarResizeParams = {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  collapseThreshold?: number;
  expandDragPx?: number;
};

type UseSidebarResizeCallbacks = {
  onResize: (widthPx: number) => void;
  onCollapse: () => void;
  onExpand: (widthPx: number) => void;
};

type UseSidebarResizeOptions = {
  isCollapsed: boolean;
} & UseSidebarResizeParams &
  UseSidebarResizeCallbacks;

type UseSidebarResizeReturn = {
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleDoubleClick: () => void;
};

/** Clamp a width to the inclusive `[min, max]` range. */
function clampWidth(width: number, min: number, max: number) {
  return Math.max(min, Math.min(max, width));
}

/** Expand a collapsed sidebar once a drag pulls past the expand threshold. */
function handleCollapsedDrag(
  rawWidth: number,
  e: MouseEvent,
  startXRef: React.RefObject<number>,
  startWidthRef: React.RefObject<number>,
  wasCollapsedRef: React.RefObject<boolean>,
  expandDragPx: number,
  minWidth: number,
  maxWidth: number,
  onExpand: (widthPx: number) => void,
) {
  if (rawWidth <= expandDragPx) {
    return;
  }
  const w = clampWidth(rawWidth, minWidth, maxWidth);
  onExpand(w);
  startXRef.current = e.clientX;
  startWidthRef.current = w;
  wasCollapsedRef.current = false;
}

/** Resize an expanded sidebar, collapsing it when the drag falls below the collapse threshold. */
function handleExpandedDrag(
  rawWidth: number,
  e: MouseEvent,
  startXRef: React.RefObject<number>,
  startWidthRef: React.RefObject<number>,
  wasCollapsedRef: React.RefObject<boolean>,
  collapseThreshold: number,
  minWidth: number,
  maxWidth: number,
  onCollapse: () => void,
  onResize: (widthPx: number) => void,
) {
  if (rawWidth < minWidth * collapseThreshold) {
    onCollapse();
    startXRef.current = e.clientX;
    startWidthRef.current = 0;
    wasCollapsedRef.current = true;
    return;
  }
  onResize(clampWidth(rawWidth, minWidth, maxWidth));
}

/**
 * Drives drag-to-resize and double-click-to-reset for a collapsible sidebar.
 *
 * @param options - Current `isCollapsed` state, width bounds (`minWidth`/`maxWidth`/`defaultWidth`),
 *   the `collapseThreshold` and `expandDragPx` drag tuning, and the `onResize`/`onCollapse`/`onExpand`
 *   callbacks invoked as the drag crosses each boundary.
 * @returns `isDragging` plus `handleMouseDown` and `handleDoubleClick` handlers to wire onto the resize handle.
 */
function useSidebarResize({
  isCollapsed,
  minWidth,
  maxWidth,
  defaultWidth,
  collapseThreshold = 0.7,
  expandDragPx = 40,
  onResize,
  onCollapse,
  onExpand,
}: UseSidebarResizeOptions): UseSidebarResizeReturn {
  const [isDragging, setIsDragging] = useState(false);
  const didDragRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const wasCollapsedRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      didDragRef.current = false;
      startXRef.current = e.clientX;
      wasCollapsedRef.current = isCollapsed;

      if (isCollapsed) {
        startWidthRef.current = 0;
      } else {
        const sidebar = document.querySelector(
          '[data-slot="sidebar-container"]',
        );
        startWidthRef.current = sidebar
          ? sidebar.getBoundingClientRect().width
          : defaultWidth;
      }
    },
    [isCollapsed, defaultWidth],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handleMouseMove(e: MouseEvent) {
      const delta = e.clientX - startXRef.current;
      if (Math.abs(delta) > 3) {
        didDragRef.current = true;
      }
      if (!didDragRef.current) {
        return;
      }

      const rawWidth = wasCollapsedRef.current
        ? delta
        : startWidthRef.current + delta;

      if (wasCollapsedRef.current) {
        handleCollapsedDrag(
          rawWidth,
          e,
          startXRef,
          startWidthRef,
          wasCollapsedRef,
          expandDragPx,
          minWidth,
          maxWidth,
          onExpand,
        );
        return;
      }

      handleExpandedDrag(
        rawWidth,
        e,
        startXRef,
        startWidthRef,
        wasCollapsedRef,
        collapseThreshold,
        minWidth,
        maxWidth,
        onCollapse,
        onResize,
      );
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [
    isDragging,
    onResize,
    onCollapse,
    onExpand,
    minWidth,
    maxWidth,
    collapseThreshold,
    expandDragPx,
  ]);

  const handleDoubleClick = useCallback(() => {
    onResize(defaultWidth);
  }, [onResize, defaultWidth]);

  return { isDragging, handleMouseDown, handleDoubleClick };
}

export type {
  UseSidebarResizeCallbacks,
  UseSidebarResizeOptions,
  UseSidebarResizeParams,
  UseSidebarResizeReturn,
};
export { useSidebarResize };
