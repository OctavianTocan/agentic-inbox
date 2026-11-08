import { act, render } from '@testing-library/react';
import type { ComponentPropsWithoutRef } from 'react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AnimationConfig,
  Markdown
} from '../src/design-system/components/ui/ai/markdown/markdown';
import { StreamingMarkdown } from '../src/design-system/components/ui/ai/markdown/streaming-markdown';
import { useRevealedText } from '../src/design-system/components/ui/ai/markdown/use-revealed-text';

// jsdom has no Web Workers; CodeView's Pierre highlighter pool constructs
// them when a fenced code block mounts.
class WorkerStub {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  postMessage = vi.fn();
  terminate = vi.fn();
}

vi.stubGlobal('Worker', WorkerStub);

type ParagraphProps = ComponentPropsWithoutRef<'p'>;
type SpanProps = ComponentPropsWithoutRef<'span'>;

describe('AI Markdown streaming', () => {
  it('keeps an existing markdown block mounted when streamed text appends', () => {
    let mountCount = 0;
    let unmountCount = 0;

    /** Paragraph component that records block remounts during rerender. */
    function TrackingParagraph(props: ParagraphProps) {
      useEffect(() => {
        mountCount += 1;
        return () => {
          unmountCount += 1;
        };
      }, []);

      return <p>{props.children}</p>;
    }

    const components = { p: TrackingParagraph };
    const { rerender } = render(
      <Markdown animation={false} components={components}>
        Soccer is
      </Markdown>
    );

    expect(mountCount).toBe(1);

    rerender(
      <Markdown animation={false} components={components}>
        Soccer is the world's most popular sport.
      </Markdown>
    );

    expect(mountCount).toBe(1);
    expect(unmountCount).toBe(0);
  });

  it('wraps every word appended after the baseline as its own token', () => {
    const animation = {
      type: 'blur',
      duration: 120,
      delay: 0,
      stagger: 0
    } satisfies AnimationConfig;

    const { container, rerender } = render(
      <StreamingMarkdown animation={animation} isStreaming={true}>
        one
      </StreamingMarkdown>
    );

    expect(container.querySelectorAll('.animate-token')).toHaveLength(0);

    rerender(
      <StreamingMarkdown animation={animation} isStreaming={true}>
        one two
      </StreamingMarkdown>
    );

    expect(
      [...container.querySelectorAll('.animate-token')].map(
        (node) => node.textContent
      )
    ).toEqual([' two']);
    expect(container.textContent).toBe('one two');

    // The earlier word must stay a token (so its entrance animation keeps
    // running) instead of being demoted to plain text when the next word lands.
    rerender(
      <StreamingMarkdown animation={animation} isStreaming={true}>
        one two three
      </StreamingMarkdown>
    );

    expect(
      [...container.querySelectorAll('.animate-token')].map(
        (node) => node.textContent
      )
    ).toEqual([' two ', 'three']);
    expect(container.textContent).toBe('one two three');
  });

  it('mounts a fresh token span for each appended word', () => {
    let mounts = 0;
    let unmounts = 0;

    /** Records true mount/unmount of each streaming token span. */
    function TrackingSpan(props: SpanProps) {
      useEffect(() => {
        mounts += 1;
        return () => {
          unmounts += 1;
        };
      }, []);
      return <span {...props}>{props.children}</span>;
    }

    const animation = {
      type: 'blur',
      duration: 120,
      delay: 0,
      stagger: 0
    } satisfies AnimationConfig;
    const components = { span: TrackingSpan };

    const { rerender } = render(
      <StreamingMarkdown
        animation={animation}
        components={components}
        isStreaming={true}
      >
        {'one '}
      </StreamingMarkdown>
    );

    for (const text of ['one two ', 'one two three ', 'one two three four ']) {
      rerender(
        <StreamingMarkdown
          animation={animation}
          components={components}
          isStreaming={true}
        >
          {text}
        </StreamingMarkdown>
      );
    }

    // A CSS entrance animation only plays on mount. Three words were appended
    // after the baseline, so three spans must mount and none may unmount (which
    // would mean an earlier word's span was reused and never re-animated).
    expect(mounts).toBe(3);
    expect(unmounts).toBe(0);
  });

  it('keeps the active appended range through same-source rerenders', () => {
    const animation = {
      type: 'blur',
      duration: 120,
      delay: 0,
      stagger: 0
    } satisfies AnimationConfig;

    const { container, rerender } = render(
      <StreamingMarkdown animation={animation} isStreaming={true}>
        one
      </StreamingMarkdown>
    );

    expect(container.querySelectorAll('.animate-token')).toHaveLength(0);

    rerender(
      <StreamingMarkdown animation={animation} isStreaming={true}>
        one two
      </StreamingMarkdown>
    );

    expect(
      [...container.querySelectorAll('.animate-token')].map(
        (node) => node.textContent
      )
    ).toEqual([' two']);

    rerender(
      <StreamingMarkdown
        animation={animation}
        containerProps={{ className: 'prose-sm prose-chat' }}
        isStreaming={true}
      >
        one two
      </StreamingMarkdown>
    );

    expect(
      [...container.querySelectorAll('.animate-token')].map(
        (node) => node.textContent
      )
    ).toEqual([' two']);
  });

  it('does not rerender the active token span during same-source parent rerenders', () => {
    let spanRenderCount = 0;

    /** Span component that records whether markdown blocks rerender unnecessarily. */
    function TrackingSpan(props: SpanProps) {
      spanRenderCount += 1;
      return <span {...props}>{props.children}</span>;
    }

    const animation = {
      type: 'blur',
      duration: 120,
      delay: 0,
      stagger: 0
    } satisfies AnimationConfig;
    const components = { span: TrackingSpan };

    const { rerender } = render(
      <StreamingMarkdown
        animation={animation}
        components={components}
        isStreaming={true}
      >
        one
      </StreamingMarkdown>
    );

    expect(spanRenderCount).toBe(0);

    rerender(
      <StreamingMarkdown
        animation={animation}
        components={components}
        isStreaming={true}
      >
        one two
      </StreamingMarkdown>
    );

    const countAfterAppend = spanRenderCount;
    expect(countAfterAppend).toBe(1);

    rerender(
      <StreamingMarkdown
        animation={animation}
        components={components}
        containerProps={{ className: 'prose-sm prose-chat' }}
        isStreaming={true}
      >
        one two
      </StreamingMarkdown>
    );

    expect(spanRenderCount).toBe(countAfterAppend);
  });

  it('renders inline markdown while animating the appended range', () => {
    const { container, rerender } = render(
      <StreamingMarkdown animation="blur" isStreaming={true}>
        Hello
      </StreamingMarkdown>
    );

    rerender(
      <StreamingMarkdown animation="blur" isStreaming={true}>
        Hello **world**
      </StreamingMarkdown>
    );

    expect(container.querySelector('strong')?.textContent).toBe('world');
    expect(
      [...container.querySelectorAll('.animate-token')].map(
        (node) => node.textContent
      )
    ).toEqual([' ', 'world']);
  });

  it('keeps a streaming list item mounted when its text appends', () => {
    let mountCount = 0;
    let unmountCount = 0;

    /** List item component that records remounts during streaming updates. */
    function TrackingListItem(props: ComponentPropsWithoutRef<'li'>) {
      useEffect(() => {
        mountCount += 1;
        return () => {
          unmountCount += 1;
        };
      }, []);

      return <li>{props.children}</li>;
    }

    const components = { li: TrackingListItem };
    const { rerender } = render(
      <StreamingMarkdown
        animation="blur"
        components={components}
        isStreaming={true}
      >
        - one
      </StreamingMarkdown>
    );

    rerender(
      <StreamingMarkdown
        animation="blur"
        components={components}
        isStreaming={true}
      >
        - one two
      </StreamingMarkdown>
    );

    expect(mountCount).toBe(1);
    expect(unmountCount).toBe(0);
  });

  it('does not animate fenced code block contents', () => {
    const { container } = render(
      <StreamingMarkdown animation="blur" isStreaming={true}>
        {'```\nconst value = 1;\n```'}
      </StreamingMarkdown>
    );

    expect(
      container.querySelector('[class*="group/code-view"]')
    ).not.toBeNull();
    expect(container.querySelectorAll('.animate-token')).toHaveLength(0);
  });
});

const HANDOFF_ANIMATION = {
  type: 'blur',
  duration: 90,
  delay: 0,
  stagger: 0
} satisfies AnimationConfig;

/** Mirrors `MessageSegmentView`: paced reveal feeding StreamingMarkdown, settling to Markdown. */
function RevealHarness({
  source,
  enabled
}: {
  source: string;
  enabled: boolean;
}) {
  const { text, isRevealing } = useRevealedText(source, {
    enabled,
    intervalMs: 50,
    maxLagMs: 500
  });
  const showStreaming = enabled || isRevealing;
  return showStreaming ? (
    <StreamingMarkdown
      animation={HANDOFF_ANIMATION}
      isStreaming={showStreaming}
    >
      {text}
    </StreamingMarkdown>
  ) : (
    <Markdown animation={false}>{source}</Markdown>
  );
}

describe('streaming reveal handoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a settled message instantly with no animated tokens', () => {
    const { container } = render(
      <RevealHarness enabled={false} source="one two three " />
    );
    expect(container.textContent).toContain('one two three');
    expect(container.querySelectorAll('.animate-token')).toHaveLength(0);
  });

  it('paces revealed text word-by-word into animated tokens', () => {
    const { container, rerender } = render(
      <RevealHarness enabled={true} source="" />
    );
    rerender(<RevealHarness enabled={true} source="one two three " />);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(container.textContent?.trim()).toBe('one');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(container.textContent?.trim()).toBe('one two');
    // The first revealed word is the un-animated baseline; later words animate.
    expect(
      container.querySelectorAll('.animate-token').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('keeps revealing after the turn ends, then settles to plain markdown', () => {
    const { container, rerender } = render(
      <RevealHarness enabled={true} source="" />
    );
    rerender(<RevealHarness enabled={true} source="one two three " />);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(container.textContent?.trim()).toBe('one');

    // Turn ends while still behind: the reveal must keep going, not snap to full.
    rerender(<RevealHarness enabled={false} source="one two three " />);
    expect(container.textContent?.trim()).toBe('one');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.textContent).toContain('one two three');
    expect(container.querySelectorAll('.animate-token')).toHaveLength(0);
  });
});
