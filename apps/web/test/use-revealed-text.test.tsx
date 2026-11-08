import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRevealedText } from '../src/design-system/components/ui/ai/markdown/use-revealed-text';

const WHITESPACE_RE = /\s+/;

/** Counts whitespace-separated words in a revealed prefix. */
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(WHITESPACE_RE).length;
}

/** Builds `count` space-terminated words: "w0 w1 w2 …". */
function words(count: number): string {
  return `${Array.from({ length: count }, (_, i) => `w${i}`).join(' ')} `;
}

const OPTS = { enabled: true, intervalMs: 50, maxLagMs: 500 } as const;

describe('useRevealedText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reveals text present at mount instantly (baseline)', () => {
    const { result } = renderHook(() =>
      useRevealedText('one two three ', OPTS)
    );
    // Text already on screen when the hook mounts must not re-reveal word by word.
    expect(result.current.text).toBe('one two three ');
    expect(result.current.isRevealing).toBe(false);
  });

  it('paces growth one word per tick when caught up', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useRevealedText(text, OPTS),
      { initialProps: { text: '' } }
    );

    rerender({ text: 'one two three ' });
    expect(result.current.text).toBe('');
    expect(result.current.isRevealing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.text).toBe('one ');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.text).toBe('one two ');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.text).toBe('one two three ');
    expect(result.current.isRevealing).toBe(false);
  });

  it('accelerates to drain a burst within maxLagMs', () => {
    const { result, rerender } = renderHook(
      ({ text }) =>
        useRevealedText(text, { enabled: true, intervalMs: 50, maxLagMs: 200 }),
      { initialProps: { text: '' } }
    );

    // ticksToDrain = 200/50 = 4, so the first tick of a 20-word backlog reveals
    // ceil(20/4)=5 words at once (acceleration), then eases out as it catches up.
    rerender({ text: words(20) });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(countWords(result.current.text)).toBe(5);

    // The decaying step fully drains well within ~2x maxLagMs, far faster than
    // the 20 ticks (1000ms) a fixed one-word-per-tick reveal would take.
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(result.current.text).toBe(words(20));
    expect(result.current.isRevealing).toBe(false);
  });

  it('keeps revealing after enabled flips false until caught up', () => {
    const { result, rerender } = renderHook(
      ({ text, enabled }) => useRevealedText(text, { ...OPTS, enabled }),
      { initialProps: { text: '', enabled: true } }
    );

    rerender({ text: 'one two three four ', enabled: true });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.text).toBe('one ');

    // Turn ends while still behind: must finish revealing, then stop.
    rerender({ text: 'one two three four ', enabled: false });
    expect(result.current.isRevealing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.text).toBe('one two three four ');
    expect(result.current.isRevealing).toBe(false);
  });

  it('releases the final partial word only once streaming stops', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useRevealedText('one two three', { ...OPTS, enabled }),
      { initialProps: { enabled: true } }
    );

    // "three" has no trailing whitespace, so it is held while streaming.
    expect(result.current.text).toBe('one two ');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.text).toBe('one two ');

    rerender({ enabled: false });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.text).toBe('one two three');
    expect(result.current.isRevealing).toBe(false);
  });

  it('never reveals a half word while streaming', () => {
    const { result } = renderHook(() => useRevealedText('one two thr', OPTS));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.text).toBe('one two ');
    expect(result.current.text).not.toContain('thr');
  });

  it('renders a completed message instantly and arms no timer', () => {
    const { result } = renderHook(() =>
      useRevealedText('one two three', { ...OPTS, enabled: false })
    );
    expect(result.current.text).toBe('one two three');
    expect(result.current.isRevealing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reveals everything instantly under reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const { result, rerender } = renderHook(
      ({ text }) => useRevealedText(text, OPTS),
      { initialProps: { text: '' } }
    );
    rerender({ text: 'one two three four five ' });
    expect(result.current.text).toBe('one two three four five ');
    expect(result.current.isRevealing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the reveal timer on unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ text }) => useRevealedText(text, OPTS),
      { initialProps: { text: '' } }
    );
    rerender({ text: words(10) });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clamps the revealed prefix if the source shrinks', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useRevealedText(text, OPTS),
      { initialProps: { text: 'one two three four five ' } }
    );
    expect(result.current.text).toBe('one two three four five ');

    rerender({ text: 'one two ' });
    expect(result.current.text).toBe('one two ');
    expect(result.current.isRevealing).toBe(false);
  });

  it('re-paces after the source shrinks then grows again', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useRevealedText(text, OPTS),
      { initialProps: { text: 'one two three four five ' } }
    );

    rerender({ text: 'one two ' });
    expect(result.current.text).toBe('one two ');

    // Grow past the old length: must pace from the new boundary, not jump back
    // to the stale (pre-shrink) reveal position.
    rerender({ text: 'one two three four five six ' });
    expect(result.current.text).toBe('one two ');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.text).toBe('one two three ');
  });
});
