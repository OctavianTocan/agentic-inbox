"use client";

import type { TableOfContents, TOCItemType } from "fumadocs-core/toc";
import * as Primitive from "fumadocs-core/toc";
import { useOnChange } from "fumadocs-core/utils/use-on-change";
import { useEffect, useRef, useState } from "react";

import { ArrowUpIcon } from "../../../components/icons";
import { cn } from "../../../lib/utils";
import { Button } from "../button";

type TOCProps = {
  readonly items: TableOfContents;
  readonly className?: string;
};

/**
 * Sticky table of contents with multi-active scroll spy, an animated
 * thumb that spans every heading currently visible in the viewport,
 * and a scroll-to-top control that fades in as the user scrolls.
 * Renders nothing when `items` is empty.
 *
 * Sticky positioning engages only when no ancestor between this nav
 * and the document scroll uses `overflow: hidden | clip | auto | scroll`.
 * The consumer's wrapping `<aside>` (and every parent up to the body)
 * must keep `overflow: visible`; otherwise the nav scrolls away with
 * its container instead of sticking.
 *
 * @param props - TOC props.
 * @param props.items - Heading list. Each item carries `title`, `url`, and `depth`.
 * @param props.className - Extra classes merged onto the sticky container.
 * @returns The rendered table of contents, or null when no items are provided.
 */
export function TOC({ items, className }: TOCProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Primitive.AnchorProvider toc={items}>
      <nav
        className={cn(
          "sticky top-12 flex max-h-[calc(100svh-3rem)] flex-col gap-3 py-6",
          className,
        )}
        data-slot="docs-toc"
      >
        <p className="px-3 font-medium text-[0.7rem] text-muted-foreground uppercase tracking-wider">
          On this page
        </p>
        <TOCList items={items} />
        <ScrollToTop />
      </nav>
    </Primitive.AnchorProvider>
  );
}

type TOCListProps = {
  readonly items: TableOfContents;
};

/** Scrollable list of TOC anchors with the multi-active highlight thumb on the leading edge. */
function TOCList({ items }: TOCListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative min-h-0 overflow-auto [scrollbar-width:none]"
      ref={viewportRef}
    >
      <Primitive.ScrollProvider containerRef={viewportRef}>
        <div className="relative" ref={containerRef}>
          <TOCThumb containerRef={containerRef} />
          <ul className="flex flex-col">
            {items.map((item) => (
              <TOCItem item={item} key={item.url} />
            ))}
          </ul>
        </div>
      </Primitive.ScrollProvider>
    </div>
  );
}

type TOCItemProps = {
  readonly item: TOCItemType;
};

/** Single TOC anchor wired to the active-tracking system via the fumadocs primitive. */
function TOCItem({ item }: TOCItemProps) {
  return (
    <li style={{ paddingInlineStart: 12 * Math.max(item.depth - 1, 0) }}>
      <Primitive.TOCItem
        className="block py-1 pl-3 text-[0.8rem] text-muted-foreground leading-relaxed transition-colors hover:text-foreground data-[active=true]:text-primary"
        href={item.url}
      >
        {item.title}
      </Primitive.TOCItem>
    </li>
  );
}

type TOCThumbProps = {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
};

/** Vertical highlight bar positioned via CSS variables to span every currently-visible heading. */
function TOCThumb({ containerRef }: TOCThumbProps) {
  const active = Primitive.useActiveAnchors();
  const thumbRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!(container && thumb)) {
      return;
    }
    /** Recomputes thumb extents from the latest active set and the live container layout. */
    const sync = () => {
      writeThumbStyle(thumb, computeThumb(container, activeRef.current));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  useOnChange(active, (next) => {
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!(container && thumb)) {
      return;
    }
    writeThumbStyle(thumb, computeThumb(container, next));
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 h-(--thumb-height) w-px origin-top bg-primary transition-[transform,height] duration-200 ease-out"
      ref={thumbRef}
      style={{
        transform: "translateY(var(--thumb-top, 0))",
        opacity: "var(--thumb-opacity, 0)",
      }}
    />
  );
}

const SCROLL_TOP_THRESHOLD = 200;

/** Icon-only button that fades in once the page has scrolled past the threshold and smoothly returns to top. */
function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(() =>
    typeof window !== "undefined"
      ? window.scrollY > SCROLL_TOP_THRESHOLD
      : false,
  );

  useEffect(() => {
    /** Mirrors the live scroll position into local visibility state. */
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_TOP_THRESHOLD);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /** Smoothly returns the document to the top. */
  const handleTocItemClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      aria-label="Scroll to top"
      className={cn(
        "self-start text-muted-foreground transition-opacity duration-200 hover:text-foreground",
        isVisible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={handleTocItemClick}
      size="icon-sm"
      variant="ghost"
    >
      <ArrowUpIcon />
    </Button>
  );
}

type ThumbExtents = readonly [top: number, height: number];

/** Returns the topmost-to-bottommost vertical extents that cover every active anchor inside `container`. */
function computeThumb(
  container: HTMLElement,
  active: readonly string[],
): ThumbExtents {
  if (active.length === 0 || container.clientHeight === 0) {
    return [0, 0];
  }
  let upper = Number.POSITIVE_INFINITY;
  let lower = 0;
  for (const id of active) {
    const element = container.querySelector<HTMLElement>(`a[href="#${id}"]`);
    if (!element) {
      continue;
    }
    const styles = getComputedStyle(element);
    upper = Math.min(
      upper,
      element.offsetTop + Number.parseFloat(styles.paddingTop),
    );
    lower = Math.max(
      lower,
      element.offsetTop +
        element.clientHeight -
        Number.parseFloat(styles.paddingBottom),
    );
  }
  if (upper === Number.POSITIVE_INFINITY) {
    return [0, 0];
  }
  return [upper, lower - upper];
}

/** Pushes the computed extents to the thumb element via CSS custom properties so transitions stay on the compositor. */
function writeThumbStyle(thumb: HTMLElement, [top, height]: ThumbExtents) {
  thumb.style.setProperty("--thumb-top", `${top}px`);
  thumb.style.setProperty("--thumb-height", `${height}px`);
  thumb.style.setProperty("--thumb-opacity", height > 0 ? "1" : "0");
}
