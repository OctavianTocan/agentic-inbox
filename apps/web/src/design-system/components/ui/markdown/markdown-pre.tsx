"use client";

import type { Element as HastElement } from "hast";
import type { ReactNode } from "react";
import { extractTextContent } from "./extract-text-content";
import { PlainCodeBlock } from "./markdown-code-block";

type MarkdownPreProps = {
  node?: HastElement | undefined;
  children?: ReactNode | undefined;
};

const TRAILING_NEWLINE_RE = /\n$/;

/**
 * `<pre>` element override for the markdown component map.
 *
 * Fenced code with a `language-*` class is unwrapped (the inner `code`
 * element renders the syntax-highlighted block on its own), and any other
 * `<pre>` falls back to a plain monospaced block. Everything else passes
 * through as a fragment so callers can wrap differently.
 *
 * @param props - Component props.
 * @param props.node - The hast node react-markdown passes for the element.
 * @param props.children - Rendered children of the `<pre>`.
 */
export function MarkdownPre({ node, children }: MarkdownPreProps) {
  const codeChild = node?.children[0];
  if (codeChild?.type === "element" && codeChild.tagName === "code") {
    const codeClassName = codeChild.properties?.className;
    if (
      Array.isArray(codeClassName) &&
      codeClassName.some(
        (c: unknown) => typeof c === "string" && c.startsWith("language-"),
      )
    ) {
      return <>{children}</>;
    }
    const codeText = extractTextContent(children).replace(
      TRAILING_NEWLINE_RE,
      "",
    );
    return <PlainCodeBlock code={codeText} />;
  }
  return <>{children}</>;
}
