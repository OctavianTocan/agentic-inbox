"use client";

import type { Element as HastElement } from "hast";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import type { Components } from "react-markdown";
import type { AnimationConfig } from "@/ai-ui/hooks/use-animation-duration";
import { tokenAnimationStyle } from "@/ai-ui/ui/token-animation-style";
import { cn } from "../../../../lib/utils";
import { CodeView } from "../../code-view/code-view";
import { extractTextContent } from "../../markdown/extract-text-content";
import {
  MarkdownDetails,
  MarkdownSummary,
} from "../../markdown/markdown-details";
import { MarkdownImage } from "../../markdown/markdown-image";
import { MermaidDiagram } from "../../markdown/markdown-mermaid";
import { MarkdownPre } from "../../markdown/markdown-pre";
import { MarkdownTable } from "../../markdown/markdown-table";
import { LinkPreviewAnchor } from "./link-preview-anchor";

type StreamingSpanProps = ComponentProps<"span"> & {
  readonly "data-streaming-token"?: string;
  readonly dataStreamingToken?: string;
  readonly node?: unknown;
};

type MarkdownCodeBlockProps = HTMLAttributes<HTMLElement> & {
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly node?: HastElement | undefined;
};

const LANGUAGE_RE = /language-(\w+)/;
const TRAILING_NEWLINE_RE = /\n$/;

/** Renders inline and fenced code without generic streaming text diffing. */
function MarkdownCodeBlock({
  children,
  className,
  node: _node,
  ...props
}: MarkdownCodeBlockProps) {
  const languageMatch = LANGUAGE_RE.exec(className || "");
  const language = languageMatch?.[1];

  if (!language) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  const codeString = extractTextContent(children).replace(
    TRAILING_NEWLINE_RE,
    "",
  );

  if (language === "mermaid") {
    return <MermaidDiagram code={codeString} />;
  }

  return (
    <CodeView className="not-prose" code={codeString} language={language} />
  );
}

/** Creates a span renderer that animates only explicit streaming range markers. */
function createStreamingSpan(animation: AnimationConfig | null) {
  /** Renders a regular span or the newest streaming-token marker. */
  return function StreamingSpan({
    children,
    className,
    node: _node,
    style,
    "data-streaming-token": streamingToken,
    dataStreamingToken,
    ...props
  }: StreamingSpanProps) {
    const isStreamingToken =
      streamingToken === "true" || dataStreamingToken === "true";
    if (!isStreamingToken || !animation?.enabled) {
      return (
        <span className={className} style={style} {...props}>
          {children}
        </span>
      );
    }

    return (
      <span
        className={cn("animate-token", className)}
        style={{ ...tokenAnimationStyle(animation, 0, 0), ...style }}
        {...props}
      >
        {children}
      </span>
    );
  };
}

/** Builds markdown component overrides for range-aware streaming rendering. */
export function createStreamingComponents(
  animation: AnimationConfig | null,
): Partial<Components> {
  return {
    a: (props) => <LinkPreviewAnchor animateChildren={false} {...props} />,
    code: (props) => <MarkdownCodeBlock {...props} />,
    details: MarkdownDetails,
    img: (props) => <MarkdownImage {...props} />,
    pre: MarkdownPre,
    span: createStreamingSpan(animation),
    summary: MarkdownSummary,
    table: MarkdownTable,
  };
}
