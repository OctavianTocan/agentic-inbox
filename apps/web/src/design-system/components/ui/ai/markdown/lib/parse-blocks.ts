import { marked, type Token } from "marked";
import remend from "remend";
import { prepareMarkdownMathSource } from "../../../markdown/markdown-math";

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export type MarkdownBlockWithOffset = {
  readonly content: string;
  readonly startOffset: number;
};

/** Applies the same source normalization used before markdown block parsing. */
export function prepareMarkdownBlockSource(markdown: string): string {
  return prepareMarkdownMathSource(remend(markdown));
}

/** Update an open-HTML-tag stack from one token's raw text. */
function updateHtmlStack(token: Token, stack: string[]): string[] {
  if (token.type !== "html") {
    return stack;
  }
  const next = [...stack];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null = TAG_RE.exec(token.raw);
  while (match !== null) {
    const isClosing = match[1] === "/";
    const tagName = match[2].toLowerCase();
    const isSelfClosing = match[3] === "/";
    if (!(VOID_TAGS.has(tagName) || isSelfClosing)) {
      if (isClosing) {
        const idx = next.lastIndexOf(tagName);
        if (idx >= 0) {
          next.splice(idx, 1);
        }
      } else {
        next.push(tagName);
      }
    }
    match = TAG_RE.exec(token.raw);
  }
  return next;
}

/** Push one parsed block with its source offset; the caller advances the cursor. */
function pushBlock(
  blocks: MarkdownBlockWithOffset[],
  content: string,
  startOffset: number,
): void {
  blocks.push({ content, startOffset });
}

/**
 * Split a markdown source string into top-level token chunks for memoised
 * rendering, merging raw HTML container spans (e.g. `<details>…</details>`,
 * `<div>…</div>`) into one block per outer container so a container body
 * split by blank lines is not emitted as several blocks that lose the
 * outer wrapper.
 *
 * @param markdown - Raw markdown source string.
 * @returns Array of block source strings with their normalized-source offsets.
 */
export function parseMarkdownIntoBlocksWithOffsets(
  markdown: string,
): MarkdownBlockWithOffset[] {
  const tokens = marked.lexer(prepareMarkdownBlockSource(markdown));
  const blocks: MarkdownBlockWithOffset[] = [];
  let cursor = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const startToken = tokens[i];
    const startOffset = cursor;
    let stack = updateHtmlStack(startToken, []);
    if (stack.length === 0) {
      pushBlock(blocks, startToken.raw, startOffset);
      cursor += startToken.raw.length;
      continue;
    }
    let merged = startToken.raw;
    cursor += startToken.raw.length;
    let j = i + 1;
    while (j < tokens.length && stack.length > 0) {
      merged += tokens[j].raw;
      cursor += tokens[j].raw.length;
      stack = updateHtmlStack(tokens[j], stack);
      j += 1;
    }
    pushBlock(blocks, merged, startOffset);
    i = j - 1;
  }
  return blocks;
}

/**
 * Split markdown into top-level token chunks for existing callers that do
 * not need source offsets.
 */
export function parseMarkdownIntoBlocks(markdown: string): string[] {
  return parseMarkdownIntoBlocksWithOffsets(markdown).map(
    (block) => block.content,
  );
}
