import { vi } from 'vitest';

/** Inert web Worker for jsdom, which lacks the Worker API; lets components that boot worker pools (e.g. CodeView's @pierre/diffs highlight pool) mount without unhandled rejections. */
class WorkerStub extends EventTarget {
  /** Drops messages: tests assert DOM output, never worker results. */
  postMessage(): void {}

  /** Nothing to release. */
  terminate(): void {}
}

vi.stubGlobal('Worker', WorkerStub);
