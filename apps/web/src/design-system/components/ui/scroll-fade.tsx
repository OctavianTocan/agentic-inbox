"use client";

import * as React from "react";
import { mergeRefs } from "../../lib/merge-refs";
import { cn } from "../../lib/utils";

/** Writes the three overflow data attributes the `scroll-fade` utility reads. */
function writeOverflowFlags(el: HTMLElement): void {
  const visible = el.clientHeight > 0;
  const canOverflow = visible && el.scrollHeight > el.clientHeight + 1;
  el.dataset.canOverflow = canOverflow ? "true" : "false";
  if (!canOverflow) {
    el.dataset.overflowTop = "false";
    el.dataset.overflowBottom = "false";
    return;
  }
  el.dataset.overflowTop = el.scrollTop > 1 ? "true" : "false";
  el.dataset.overflowBottom =
    el.scrollTop + el.clientHeight < el.scrollHeight - 1 ? "true" : "false";
}

/** Edge fades for external scroll viewports (cmdk, Base UI) via MutationObserver. */
export function useScrollFade(ref: React.RefObject<HTMLElement | null>): void {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    let rafId: number | null = null;

    const schedule = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        writeOverflowFlags(el);
      });
    };

    writeOverflowFlags(el);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(el);
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(el, { childList: true, subtree: true });
    el.addEventListener("scroll", schedule, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      el.removeEventListener("scroll", schedule);
    };
  }, [ref]);
}

/** Edge fades for `ScrollFade`'s viewport + inner content node (ResizeObserver only). */
function useScrollFadeWithContent(
  containerRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
): void {
  React.useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!(container && content)) {
      return;
    }

    let rafId: number | null = null;

    const schedule = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        writeOverflowFlags(container);
      });
    };

    writeOverflowFlags(container);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);
    resizeObserver.observe(content);
    container.addEventListener("scroll", schedule, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      container.removeEventListener("scroll", schedule);
    };
  }, [containerRef, contentRef]);
}

/** Scroll container with edge fades; size via `className`. */
export function ScrollFade({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  useScrollFadeWithContent(containerRef, contentRef);

  return (
    <div
      className={cn("scroll-fade min-w-0", className)}
      data-can-overflow="false"
      data-overflow-bottom="false"
      data-overflow-top="false"
      data-slot="scroll-fade"
      ref={mergeRefs(containerRef, ref)}
      {...props}
    >
      <div className="min-w-0" ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
