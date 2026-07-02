"use client";

import type React from "react";
import { memo } from "react";
import { CodeView } from "../code-view/code-view";
import { extractTextContent } from "./extract-text-content";
import { MermaidDiagram } from "./markdown-mermaid";

export interface MarkdownCodeBlockProps
  extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  className?: string;
  node?: unknown;
}

const LANGUAGE_RE = /language-(\w+)/;
const TRAILING_NEWLINE_RE = /\n$/;

/** Renders a markdown code block: syntax-highlighted code, a mermaid diagram, or inline code. */
function MarkdownCodeBlockInner({
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
    <CodeView
      code={codeString}
      language={language}
      className="not-prose my-4"
    />
  );
}

/** Renders a markdown code block for the shared component map. */
export const MarkdownCodeBlock = memo(MarkdownCodeBlockInner);

/** Syntax-free code block for rendering raw text content. */
export function PlainCodeBlock({ code }: { code: string }) {
  return (
    <CodeView
      className="not-prose my-4"
      code={code}
      language="text"
      lineNumbers={false}
    />
  );
}
