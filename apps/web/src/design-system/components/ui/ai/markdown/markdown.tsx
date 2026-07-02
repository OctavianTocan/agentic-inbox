"use client";

import React, { type ElementType, memo, useMemo } from "react";
import type { Components, Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  AnimationConfig,
  AnimationType,
} from "@/ai-ui/hooks/use-animation-duration";
import { MarkdownProvider } from "@/ai-ui/providers/markdown-provider";
import { AnimatedComponent } from "@/ai-ui/ui/animated-text";
import { cn } from "../../../../lib/utils";
import {
  MarkdownDetails,
  MarkdownSummary,
} from "../../markdown/markdown-details";
import { htmlRehypePlugins } from "../../markdown/markdown-html";
import { MarkdownImage } from "../../markdown/markdown-image";
import {
  mathRehypePlugins,
  mathRemarkPlugins,
} from "../../markdown/markdown-math";
import { MarkdownPre } from "../../markdown/markdown-pre";
import { MarkdownTable } from "../../markdown/markdown-table";
import { AnimatedMarkdownCodeBlock } from "./animated-code-block";
import { MemoizedMarkdownBlock } from "./lib/memoized-block";
import { parseMarkdownIntoBlocks } from "./lib/parse-blocks";
import { LinkPreviewAnchor } from "./link-preview-anchor";
import "./animations.css";

export type { AnimationConfig, AnimationType };

const DEFAULT_REMARK_PLUGINS: Options["remarkPlugins"] = [
  remarkGfm,
  ...mathRemarkPlugins,
];
const DEFAULT_REHYPE_PLUGINS: Options["rehypePlugins"] = [
  ...htmlRehypePlugins,
  ...mathRehypePlugins,
];

const ANIMATED_COMPONENTS: Partial<Components> = {
  p: (props) => <AnimatedComponent as="p" {...props} />,
  h1: (props) => <AnimatedComponent as="h1" {...props} />,
  h2: (props) => <AnimatedComponent as="h2" {...props} />,
  h3: (props) => <AnimatedComponent as="h3" {...props} />,
  h4: (props) => <AnimatedComponent as="h4" {...props} />,
  h5: (props) => <AnimatedComponent as="h5" {...props} />,
  h6: (props) => <AnimatedComponent as="h6" {...props} />,
  li: (props) => <AnimatedComponent as="li" {...props} />,
  strong: (props) => <AnimatedComponent as="strong" {...props} />,
  em: (props) => <AnimatedComponent as="em" {...props} />,
  code: (props) => <AnimatedMarkdownCodeBlock {...props} />,
  pre: MarkdownPre,
  a: (props) => <LinkPreviewAnchor {...props} />,
  img: (props) => <MarkdownImage {...props} />,
  details: MarkdownDetails,
  summary: MarkdownSummary,
  table: MarkdownTable,
};

type MarkdownBlock = {
  readonly content: string;
  readonly key: string;
};

export type MarkdownProps = Omit<Options, "children"> & {
  as?: ElementType;
  children: string;
  containerProps?: React.HTMLAttributes<HTMLElement> & { className?: string };
  animation?: AnimationType | AnimationConfig | false;
  waitForAnimation?: boolean;
};

/** Parses markdown into keyed blocks for stable streaming renders. */
function createMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const content of parseMarkdownIntoBlocks(markdown)) {
    blocks.push({
      content,
      key: `block-${blocks.length}`,
    });
  }
  return blocks;
}

/** Block-by-block memoised markdown renderer for streaming AI content. */
function MarkdownInner({
  animation,
  components,
  as: Container = "div",
  containerProps,
  waitForAnimation = true,
  remarkPlugins = DEFAULT_REMARK_PLUGINS,
  rehypePlugins = DEFAULT_REHYPE_PLUGINS,
  children,
  ...restOptions
}: MarkdownProps) {
  const blocks = useMemo(() => createMarkdownBlocks(children), [children]);

  const mergedComponents = useMemo<Partial<Components>>(
    () => ({ ...ANIMATED_COMPONENTS, ...components }),
    [components],
  );

  return (
    <MarkdownProvider
      animation={animation}
      content={children}
      waitForAnimation={waitForAnimation}
    >
      <Container
        {...containerProps}
        className={cn(
          "prose dark:prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0",
          containerProps?.className,
        )}
      >
        {blocks.map((block) => (
          <MemoizedMarkdownBlock
            key={block.key}
            {...restOptions}
            components={mergedComponents}
            content={block.content}
            rehypePlugins={rehypePlugins}
            remarkPlugins={remarkPlugins}
          />
        ))}
      </Container>
    </MarkdownProvider>
  );
}

export const Markdown = memo(MarkdownInner);
