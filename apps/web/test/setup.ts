import { vi } from 'vitest';

/** Inert web Worker for jsdom, which lacks the Worker API; lets components that boot worker pools (e.g. CodeView's @pierre/diffs highlight pool) mount without unhandled rejections. */
class WorkerStub extends EventTarget {
  /** Drops messages: tests assert DOM output, never worker results. */
  postMessage(): void {}

  /** Nothing to release. */
  terminate(): void {}
}

vi.stubGlobal('Worker', WorkerStub);

/** Stable `MediaQueryList` for components that branch on viewport or motion preferences. */
class MediaQueryListStub extends EventTarget implements MediaQueryList {
  onchange:
    | ((this: MediaQueryList, event: MediaQueryListEvent) => unknown)
    | null = null;
  readonly matches = false;

  constructor(readonly media: string) {
    super();
  }

  addListener(
    callback:
      | ((this: MediaQueryList, event: MediaQueryListEvent) => unknown)
      | null
  ): void {
    if (callback) {
      this.onchange = callback;
    }
  }

  removeListener(
    callback:
      | ((this: MediaQueryList, event: MediaQueryListEvent) => unknown)
      | null
  ): void {
    if (this.onchange === callback) {
      this.onchange = null;
    }
  }
}

/** Inert resize observer for layout primitives that measure in browsers. */
class ResizeObserverStub implements ResizeObserver {
  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

/** Inert intersection observer for viewport-aware primitives. */
class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds = [];

  disconnect(): void {}

  observe(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(): void {}
}

vi.stubGlobal(
  'matchMedia',
  (query: string): MediaQueryList => new MediaQueryListStub(query)
);
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
