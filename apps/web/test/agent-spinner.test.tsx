import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AgentSpinner,
  SPINNER_VARIANTS
} from '@/design-system/components/ui/agent-spinner';

afterEach(cleanup);

/** Read the layout-locking inline styles off the spinner's status span. */
function spinnerBox(container: HTMLElement): {
  height: string;
  lineHeight: string;
} {
  const span = container.querySelector('[role="status"]');
  if (!(span instanceof HTMLElement)) {
    throw new Error('spinner status span not found');
  }
  return { height: span.style.height, lineHeight: span.style.lineHeight };
}

describe('AgentSpinner layout stability', () => {
  it('locks height and line-height to 1em for every variant', () => {
    // A per-glyph line box (braille/box glyphs falling back to a taller font)
    // is what made the parent grow and shrink across frames; the fixed 1em box
    // is the regression guard against that.
    for (const variant of SPINNER_VARIANTS) {
      const { container } = render(<AgentSpinner variant={variant} />);
      const box = spinnerBox(container);
      expect(box.height, variant).toBe('1em');
      expect(box.lineHeight, variant).toBe('1em');
      cleanup();
    }
  });

  it('keeps the box height fixed as frames cycle', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<AgentSpinner variant="scan" size={1.5} />);
      const before = spinnerBox(container);

      // Advance well past several frame intervals so a shifting glyph would
      // have swapped the rendered content by now.
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(spinnerBox(container)).toEqual(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the box height independent of the size prop', () => {
    const small = render(<AgentSpinner variant="dotsCircle" size={0.75} />);
    const large = render(<AgentSpinner variant="dotsCircle" size={3} />);

    // Height is expressed in em so it tracks font-size instead of adding a
    // fixed pixel offset; the locked value is identical regardless of size.
    expect(spinnerBox(small.container)).toEqual(spinnerBox(large.container));
  });
});
