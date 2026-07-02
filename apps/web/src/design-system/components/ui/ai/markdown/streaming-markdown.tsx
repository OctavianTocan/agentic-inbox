"use client";

import React, { type ElementType, memo, useMemo, useRef } from "react";
import type { Components, Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  AnimationConfig,
  AnimationType,
} from "@/ai-ui/hooks/use-animation-duration";
import { cn } from "../../../../lib/utils";
import { htmlRehypePlugins } from "../../markdown/markdown-html";
import {
  mathRehypePlugins,
  mathRemarkPlugins,
} from "../../markdown/markdown-math";
import { MemoizedMarkdownBlock } from "./lib/memoized-block";
import {
  type MarkdownBlockWithOffset,
  parseMarkdownIntoBlocksWithOffsets,
  prepareMarkdownBlockSource,
} from "./lib/parse-blocks";
import {
  hasSourceRange,
  remarkStreamingRange,
  type SourceRange,
} from "./lib/streaming-range";
import { createStreamingComponents } from "./streaming-components";
import "./animations.css";

type StreamingMarkdownBlock = MarkdownBlockWithOffset & {
  readonly activeRange: SourceRange | null;
  readonly key: string;
};

type RenderMarkdownBlock = StreamingMarkdownBlock & {
  readonly remarkPlugins: Options["remarkPlugins"];
};

export type StreamingMarkdownProps = Omit<Options, "children"> & {
  as?: ElementType;
  children: string;
  containerProps?: React.HTMLAttributes<HTMLElement> & { className?: string };
  animation?: AnimationType | AnimationConfig | false;
  isStreaming: boolean;
};

const DEFAULT_REMARK_PLUGINS: Options["remarkPlugins"] = [
  remarkGfm,
  ...mathRemarkPlugins,
];
const DEFAULT_REHYPE_PLUGINS: Options["rehypePlugins"] = [
  ...htmlRehypePlugins,
  ...mathRehypePlugins,
];

/**
 * Returns the source range to reveal with animation: everything appended after
 * the first streaming render, so text already on screen at stream start is not
 * re-animated. Identity stays stable while the range is unchanged.
 */
function useStreamingRevealRange(
  source: string,
  isStreaming: boolean,
): SourceRange | null {
  const baselineLengthRef = useRef<number | null>(null);
  const rangeRef = useRef<SourceRange | null>(null);

  let start: number | null;
  if (!isStreaming || source.length === 0) {
    baselineLengthRef.current = null;
    start = null;
  } else if (
    baselineLengthRef.current === null ||
    source.length < baselineLengthRef.current
  ) {
    // First streaming render, or the source was replaced/shrank: re-anchor the
    // baseline so pre-existing text does not blur in as a batch.
    baselineLengthRef.current = source.length;
    start = null;
  } else {
    start = baselineLengthRef.current;
  }

  const previous = rangeRef.current;
  if (start === null || start >= source.length) {
    if (previous !== null) {
      rangeRef.current = null;
    }
  } else if (
    previous === null ||
    previous.start !== start ||
    previous.end !== source.length
  ) {
    rangeRef.current = { start, end: source.length };
  }

  return rangeRef.current;
}

/** Converts a full-source active range into a block-local source range. */
function toLocalRange(
  block: MarkdownBlockWithOffset,
  range: SourceRange | null,
): SourceRange | null {
  if (!hasSourceRange(range)) {
    return null;
  }

  const blockEnd = block.startOffset + block.content.length;
  const start = Math.max(range.start, block.startOffset);
  const end = Math.min(range.end, blockEnd);
  if (end <= start) {
    return null;
  }
  return {
    start: start - block.startOffset,
    end: end - block.startOffset,
  };
}

/** Parses markdown into stable render blocks with each block's active range. */
function createStreamingBlocks(
  markdown: string,
  activeRange: SourceRange | null,
): StreamingMarkdownBlock[] {
  const blocks: StreamingMarkdownBlock[] = [];
  for (const block of parseMarkdownIntoBlocksWithOffsets(markdown)) {
    blocks.push({
      ...block,
      activeRange: toLocalRange(block, activeRange),
      key: `block-${blocks.length}`,
    });
  }
  return blocks;
}

/** Builds the remark plugins for one streaming block, reusing the base array when the block has no active range. */
function buildBlockRemarkPlugins({
  activeRange,
  remarkPlugins,
}: {
  readonly activeRange: SourceRange | null;
  readonly remarkPlugins: Options["remarkPlugins"];
}): Options["remarkPlugins"] {
  if (!hasSourceRange(activeRange)) {
    return remarkPlugins;
  }
  return [
    ...(remarkPlugins ?? []),
    [remarkStreamingRange, { range: activeRange }],
  ];
}

/** Attaches stable plugin arrays to blocks so same-source rerenders do not restart animation. */
function createRenderBlocks({
  blocks,
  remarkPlugins,
}: {
  readonly blocks: readonly StreamingMarkdownBlock[];
  readonly remarkPlugins: Options["remarkPlugins"];
}): RenderMarkdownBlock[] {
  return blocks.map((block) => ({
    ...block,
    remarkPlugins: buildBlockRemarkPlugins({
      activeRange: block.activeRange,
      remarkPlugins,
    }),
  }));
}

/** Resolves streaming animation config while leaving reduced motion to CSS. */
function resolveStreamingAnimation(
  animation: AnimationType | AnimationConfig | false | undefined,
): AnimationConfig | null {
  if (!animation) {
    return null;
  }
  if (typeof animation === "string") {
    return {
      type: animation,
      duration: 200,
      delay: 10,
      enabled: true,
      easing: "ease-out",
    };
  }
  return {
    duration: 200,
    delay: 10,
    enabled: true,
    easing: "ease-out",
    ...animation,
  };
}

/** Renders active streaming markdown with animation bound to source ranges. */
function StreamingMarkdownInner({
  animation,
  components,
  as: Container = "div",
  containerProps,
  isStreaming,
  remarkPlugins = DEFAULT_REMARK_PLUGINS,
  rehypePlugins = DEFAULT_REHYPE_PLUGINS,
  children,
  ...restOptions
}: StreamingMarkdownProps) {
  const source = useMemo(
    () => prepareMarkdownBlockSource(children),
    [children],
  );
  const activeRange = useStreamingRevealRange(source, isStreaming);
  const effectiveAnimation = useMemo(
    () => resolveStreamingAnimation(animation),
    [animation],
  );
  const blocks = useMemo(
    () => createStreamingBlocks(children, activeRange),
    [children, activeRange],
  );
  const renderBlocks = useMemo(
    () => createRenderBlocks({ blocks, remarkPlugins }),
    [blocks, remarkPlugins],
  );
  const streamingComponents = useMemo<Partial<Components>>(
    () => ({ ...createStreamingComponents(effectiveAnimation), ...components }),
    [components, effectiveAnimation],
  );

  return (
    <Container
      {...containerProps}
      className={cn(
        "prose dark:prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0",
        containerProps?.className,
      )}
    >
      {renderBlocks.map((block) => (
        <MemoizedMarkdownBlock
          key={block.key}
          {...restOptions}
          components={streamingComponents}
          content={block.content}
          rehypePlugins={rehypePlugins}
          remarkPlugins={block.remarkPlugins}
        />
      ))}
    </Container>
  );
}

export const StreamingMarkdown = memo(StreamingMarkdownInner);
