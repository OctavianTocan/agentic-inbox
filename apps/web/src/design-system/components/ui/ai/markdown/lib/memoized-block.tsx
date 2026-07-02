"use client";

import { memo } from "react";
import ReactMarkdown, { type Options } from "react-markdown";

type MemoizedMarkdownBlockProps = Omit<Options, "children"> & {
  content: string;
  [key: string]: unknown;
};

/** Shallow record equality check used as the memo comparator. */
function shallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => Object.is(a[key], b[key]));
}

/**
 * Render a single markdown block, memoised so unchanged blocks skip
 * re-rendering during streaming.
 */
export const MemoizedMarkdownBlock = memo(function MarkdownBlock({
  content,
  ...options
}: MemoizedMarkdownBlockProps) {
  return <ReactMarkdown {...options}>{content}</ReactMarkdown>;
}, shallowEqual);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";
