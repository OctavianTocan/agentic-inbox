"use client";

import type { Element as HastElement } from "hast";
import type React from "react";
import { memo } from "react";
import { AnimatedComponent } from "@/ai-ui/ui/animated-text";
import { CodeView } from "../../code-view/code-view";
import { extractTextContent } from "../../markdown/extract-text-content";
import { MermaidDiagram } from "../../markdown/markdown-mermaid";

type AnimatedMarkdownCodeBlockProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode | undefined;
  className?: string | undefined;
  node?: HastElement | undefined;
};

const LANGUAGE_RE = /language-(\w+)/;
const TRAILING_NEWLINE_RE = /\n$/;

/** Renders a markdown `code` element for the streaming AI variant: animated inline code, a mermaid diagram, or a highlighted code view. */
function AnimatedMarkdownCodeBlockInner({
  children,
  className,
  node: _node,
  ...props
}: AnimatedMarkdownCodeBlockProps) {
  const languageMatch = LANGUAGE_RE.exec(className || "");
  const language = languageMatch?.[1];

  if (!language) {
    return (
      <AnimatedComponent as="code" className={className} {...props}>
        {children}
      </AnimatedComponent>
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
    <CodeView code={codeString} language={language} className="not-prose" />
  );
}

export const AnimatedMarkdownCodeBlock = memo(AnimatedMarkdownCodeBlockInner);
