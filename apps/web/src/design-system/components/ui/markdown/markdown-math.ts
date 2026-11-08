import type { Options } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math-extended";

const AUTOLINK_EMAIL_RE = /^<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>/;
const AUTOLINK_URI_RE = /^<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*>/;
const BLOCK_QUOTE_PREFIX_RE = /^ {0,3}>\s?/;
const CDATA_END = "]]>";
const CDATA_START = "<![CDATA[";
const FENCE_RE = /^( {0,3})(`{3,}|~{3,})/;
const HTML_DECLARATION_RE = /^<![A-Za-z]/;
const HTML_COMMENT_END = "-->";
const HTML_COMMENT_START = "<!--";
const HTML_OPEN_TAG_RE = /^<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?>/;
const HTML_PROCESSING_INSTRUCTION_END = "?>";
const HTML_PROCESSING_INSTRUCTION_START = "<?";
const HTML_SELF_CLOSING_TAG_RE = /^<[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/>/;
const HTML_NAMED_TAG_RE = /^<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?\/?>/;
const HTML_TAG_RE = /^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/;
const HTML_TYPE_1_BLOCK_TAGS = new Set(["pre", "script", "style", "textarea"]);
const HTML_TYPE_6_BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
]);
const HTML_VOID_TAGS = new Set([
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
const INDENTED_CODE_RE = /^(?: {4}|\t)/;
const LATEX_COMMAND_RE = /\\[A-Za-z]+/;
const LATEX_COMMAND_GLOBAL_RE = /\\[A-Za-z]+/g;
const LIST_ITEM_MARKER_RE = /^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]/;
const LIST_ITEM_PREFIX_RE = /^ {0,3}(?:[-+*]|\d{1,9}[.)])\s+/;
const LONG_PLAIN_WORD_RE = /[A-Za-z]{3,}/;
const MATH_SIGNAL_RE = /[\\^_{}=+\-*/<>|]/;
const NUMERIC_EXPRESSION_RE = /^[\d\s.,+\-*/()]+$/;
const NUMBER_VARIABLE_RE = /^\d[\d.,]*(?:\s+[A-Za-z])+$/;
const WHITESPACE_RE = /\s/;

type MarkdownFence = {
  marker: string;
  length: number;
};

type MarkdownHtmlBlock = {
  closingSequence: string | undefined;
  isCaseSensitive: boolean;
  shouldCloseOnBlankLine: boolean;
};

type MarkdownCodeSpan = {
  markerLength: number;
};

type MarkdownLinePreparation = {
  activeCodeSpan: MarkdownCodeSpan | undefined;
  line: string;
};

type EscapeCurrencyDollarsOptions = {
  activeCodeSpan: MarkdownCodeSpan | undefined;
  canOpenMultilineCodeSpan: (markerLength: number) => boolean;
  line: string;
};

/**
 * Prepares markdown so single-dollar math and currency can coexist.
 *
 * @param markdown - Raw markdown source before remark parsing.
 * @returns Markdown with currency-like dollars escaped outside code spans.
 */
export function prepareMarkdownMathSource(markdown: string): string {
  const lines = markdown.split("\n");
  let activeFence: MarkdownFence | undefined;
  let activeHtmlBlock: MarkdownHtmlBlock | undefined;
  let activeCodeSpan: MarkdownCodeSpan | undefined;
  let activeIndentedCodeBlock = false;
  let canStartIndentedCodeBlock = true;
  const preparedLines = lines.map((line, lineIndex) => {
    const isBlank = isMarkdownBlankLine(line);

    if (activeFence) {
      if (isClosingFence(line, activeFence)) {
        activeFence = undefined;
      }
      return line;
    }
    if (activeCodeSpan) {
      if (isBlank) {
        activeCodeSpan = undefined;
        canStartIndentedCodeBlock = true;
        return line;
      }

      const preparedLine = escapeCurrencyDollarsInInlineText({
        activeCodeSpan,
        canOpenMultilineCodeSpan: (markerLength) =>
          hasClosingBackticksInLaterLines(lines, lineIndex + 1, markerLength),
        line,
      });
      activeCodeSpan = preparedLine.activeCodeSpan;
      canStartIndentedCodeBlock = false;
      return preparedLine.line;
    }
    if (activeHtmlBlock) {
      if (
        isClosingHtmlBlock(line, activeHtmlBlock) ||
        (activeHtmlBlock.shouldCloseOnBlankLine && isBlank)
      ) {
        activeHtmlBlock = undefined;
      }
      if (isBlank) {
        canStartIndentedCodeBlock = true;
      }
      return line;
    }
    if (activeIndentedCodeBlock) {
      if (isBlank) {
        canStartIndentedCodeBlock = true;
        return line;
      }
      if (isIndentedCodeLine(line)) {
        return line;
      }

      activeIndentedCodeBlock = false;
    }
    if (isBlank) {
      canStartIndentedCodeBlock = true;
      return line;
    }

    const openingFence = readFence(line);
    if (openingFence) {
      activeFence = openingFence;
      canStartIndentedCodeBlock = true;
      return line;
    }
    if (isIndentedCodeLine(line) && canStartIndentedCodeBlock) {
      activeIndentedCodeBlock = true;
      return line;
    }
    const openingHtmlBlock = readHtmlBlock(line);
    if (openingHtmlBlock) {
      activeHtmlBlock = openingHtmlBlock;
      canStartIndentedCodeBlock = true;
      return line;
    }

    const preparedLine = escapeCurrencyDollarsInInlineText({
      activeCodeSpan,
      canOpenMultilineCodeSpan: (markerLength) =>
        hasClosingBackticksInLaterLines(lines, lineIndex + 1, markerLength),
      line,
    });
    activeCodeSpan = preparedLine.activeCodeSpan;
    canStartIndentedCodeBlock = false;
    return preparedLine.line;
  });

  return preparedLines.join("\n");
}

/** Reads a fenced-code marker from the current line when one starts there. */
function readFence(line: string): MarkdownFence | undefined {
  const match = FENCE_RE.exec(stripMarkdownContainerPrefixes(line));
  const markerRun = match?.[2];
  if (!markerRun) {
    return undefined;
  }

  return {
    marker: markerRun.charAt(0),
    length: markerRun.length,
  };
}

/** Checks whether the current line closes the active fenced-code block. */
function isClosingFence(line: string, fence: MarkdownFence): boolean {
  const comparableLine = stripBlockQuotePrefixes(line);
  const match = FENCE_RE.exec(comparableLine);
  const markerRun = match?.[2];
  if (!markerRun) {
    return false;
  }
  if (markerRun.charAt(0) !== fence.marker || markerRun.length < fence.length) {
    return false;
  }

  return comparableLine.slice(match[0].length).trim() === "";
}

/** Checks whether a line is an indented Markdown code block line. */
function isIndentedCodeLine(line: string): boolean {
  const withoutBlockQuotes = stripBlockQuotePrefixes(line);
  if (INDENTED_CODE_RE.test(withoutBlockQuotes)) {
    return true;
  }

  const withoutListMarker = stripListItemMarker(withoutBlockQuotes);
  return (
    withoutListMarker !== withoutBlockQuotes &&
    INDENTED_CODE_RE.test(withoutListMarker)
  );
}

/** Checks whether a Markdown line is blank after container prefixes. */
function isMarkdownBlankLine(line: string): boolean {
  return stripBlockQuotePrefixes(line).trim() === "";
}

/** Removes CommonMark block quote markers around fenced code blocks. */
function stripBlockQuotePrefixes(line: string): string {
  let remaining = line;
  let quoteMatch = BLOCK_QUOTE_PREFIX_RE.exec(remaining);
  while (quoteMatch) {
    remaining = remaining.slice(quoteMatch[0].length);
    quoteMatch = BLOCK_QUOTE_PREFIX_RE.exec(remaining);
  }

  return remaining;
}

/** Removes CommonMark container markers that can wrap fenced code blocks. */
function stripMarkdownContainerPrefixes(line: string): string {
  let remaining = line;
  let didStripPrefix = true;
  while (didStripPrefix) {
    didStripPrefix = false;

    const quoteMatch = BLOCK_QUOTE_PREFIX_RE.exec(remaining);
    if (quoteMatch) {
      remaining = remaining.slice(quoteMatch[0].length);
      didStripPrefix = true;
      continue;
    }

    const listMatch = LIST_ITEM_PREFIX_RE.exec(remaining);
    if (listMatch) {
      remaining = remaining.slice(listMatch[0].length);
      didStripPrefix = true;
    }
  }

  return remaining;
}

/** Removes a list marker and one following space for indentation checks. */
function stripListItemMarker(line: string): string {
  const markerMatch = LIST_ITEM_MARKER_RE.exec(line);
  if (!markerMatch) {
    return line;
  }

  return line.slice(markerMatch[0].length);
}

/** Reads a raw HTML block opener when the block spans multiple lines. */
function readHtmlBlock(line: string): MarkdownHtmlBlock | undefined {
  const trimmed = stripMarkdownContainerPrefixes(line).trimStart();
  const rawBlock = readNonTagHtmlBlock(trimmed);
  if (rawBlock) {
    return rawBlock;
  }

  const match = HTML_NAMED_TAG_RE.exec(trimmed);
  const tagName = match?.[1];
  if (!tagName) {
    return undefined;
  }

  const normalizedTagName = tagName.toLowerCase();
  if (isSelfClosingHtmlTag(trimmed) || HTML_VOID_TAGS.has(normalizedTagName)) {
    return undefined;
  }

  if (HTML_TYPE_1_BLOCK_TAGS.has(normalizedTagName)) {
    const closingTag = `</${normalizedTagName}>`;
    if (trimmed.toLowerCase().includes(closingTag)) {
      return undefined;
    }

    return {
      closingSequence: closingTag,
      isCaseSensitive: false,
      shouldCloseOnBlankLine: false,
    };
  }

  if (
    !HTML_TYPE_6_BLOCK_TAGS.has(normalizedTagName) &&
    !isTagOnlyHtmlLine(trimmed)
  ) {
    return undefined;
  }

  return {
    closingSequence: undefined,
    isCaseSensitive: true,
    shouldCloseOnBlankLine: true,
  };
}

/** Reads comments, processing instructions, declarations, and CDATA blocks. */
function readNonTagHtmlBlock(trimmed: string): MarkdownHtmlBlock | undefined {
  if (trimmed.startsWith(HTML_COMMENT_START)) {
    return readDelimitedHtmlBlock(trimmed, HTML_COMMENT_END);
  }
  if (trimmed.startsWith(HTML_PROCESSING_INSTRUCTION_START)) {
    return readDelimitedHtmlBlock(trimmed, HTML_PROCESSING_INSTRUCTION_END);
  }
  if (trimmed.startsWith(CDATA_START)) {
    return readDelimitedHtmlBlock(trimmed, CDATA_END);
  }
  if (HTML_DECLARATION_RE.test(trimmed)) {
    return readDelimitedHtmlBlock(trimmed, ">");
  }

  return undefined;
}

/** Reads a non-tag raw HTML block unless it closes on the opener line. */
function readDelimitedHtmlBlock(
  trimmed: string,
  closingSequence: string,
): MarkdownHtmlBlock | undefined {
  if (trimmed.includes(closingSequence)) {
    return undefined;
  }

  return {
    closingSequence,
    isCaseSensitive: true,
    shouldCloseOnBlankLine: false,
  };
}

/** Checks whether a raw HTML block closes on the current line. */
function isClosingHtmlBlock(line: string, block: MarkdownHtmlBlock): boolean {
  if (!block.closingSequence) {
    return false;
  }

  const source = block.isCaseSensitive ? line : line.toLowerCase();
  return source.includes(block.closingSequence);
}

/** Checks whether an HTML opener closes itself. */
function isSelfClosingHtmlTag(value: string): boolean {
  return HTML_SELF_CLOSING_TAG_RE.test(value);
}

/** Checks whether a line contains only one complete HTML tag. */
function isTagOnlyHtmlLine(trimmed: string): boolean {
  const tagMatch = HTML_TAG_RE.exec(trimmed);
  if (!tagMatch) {
    return false;
  }

  return trimmed.slice(tagMatch[0].length).trim() === "";
}

/** Escapes currency-like dollars without touching inline code spans. */
function escapeCurrencyDollarsInInlineText(
  options: EscapeCurrencyDollarsOptions,
): MarkdownLinePreparation {
  const { canOpenMultilineCodeSpan, line } = options;
  let activeCodeSpan = options.activeCodeSpan;
  let output = "";
  let index = 0;

  if (activeCodeSpan) {
    const closingIndex = findMatchingBackticks(
      line,
      index,
      activeCodeSpan.markerLength,
    );
    if (closingIndex < 0) {
      return { activeCodeSpan, line };
    }

    output += line.slice(0, closingIndex + activeCodeSpan.markerLength);
    index = closingIndex + activeCodeSpan.markerLength;
    activeCodeSpan = undefined;
  }

  while (index < line.length) {
    const character = line.charAt(index);

    if (character === "`") {
      const markerLength = countRepeatedCharacter(line, index, "`");
      const closingIndex = findMatchingBackticks(
        line,
        index + markerLength,
        markerLength,
      );
      if (closingIndex >= 0) {
        output += line.slice(index, closingIndex + markerLength);
        index = closingIndex + markerLength;
        continue;
      }
      if (canOpenMultilineCodeSpan(markerLength)) {
        output += line.slice(index);
        return {
          activeCodeSpan: { markerLength },
          line: output,
        };
      }

      output += line.slice(index, index + markerLength);
      index += markerLength;
      continue;
    }

    if (character === "<") {
      const htmlRegionEnd = findInlineHtmlRegionEnd(line, index);
      if (htmlRegionEnd > index) {
        output += line.slice(index, htmlRegionEnd);
        index = htmlRegionEnd;
        continue;
      }
    }

    if (character === "$" && shouldEscapeCurrencyDollar(line, index)) {
      output += "\\$";
      index += 1;
      continue;
    }

    output += character;
    index += 1;
  }

  return {
    activeCodeSpan,
    line: output,
  };
}

/** Counts a repeated marker run from the supplied start index. */
function countRepeatedCharacter(
  value: string,
  startIndex: number,
  marker: string,
): number {
  let index = startIndex;
  while (value.charAt(index) === marker) {
    index += 1;
  }

  return index - startIndex;
}

/** Finds the matching inline-code backtick run for a run length. */
function findMatchingBackticks(
  line: string,
  startIndex: number,
  markerLength: number,
): number {
  let index = startIndex;
  while (index < line.length) {
    if (line.charAt(index) !== "`") {
      index += 1;
      continue;
    }

    const runLength = countRepeatedCharacter(line, index, "`");
    if (runLength === markerLength) {
      return index;
    }
    index += runLength;
  }

  return -1;
}

/** Checks later lines for a closing backtick run before preserving a span. */
function hasClosingBackticksInLaterLines(
  lines: readonly string[],
  startLineIndex: number,
  markerLength: number,
): boolean {
  for (
    let lineIndex = startLineIndex;
    lineIndex < lines.length;
    lineIndex += 1
  ) {
    const line = lines[lineIndex];
    if (line === undefined) {
      continue;
    }
    if (isInlineCodeSpanBoundaryLine(line)) {
      return false;
    }
    if (findMatchingBackticks(line, 0, markerLength) >= 0) {
      return true;
    }
  }

  return false;
}

/** Checks whether a later line starts a new block before a code span closes. */
function isInlineCodeSpanBoundaryLine(line: string): boolean {
  return (
    isMarkdownBlankLine(line) ||
    readFence(line) !== undefined ||
    readHtmlBlock(line) !== undefined
  );
}

/** Finds the end offset for a same-line raw HTML region. */
function findInlineHtmlRegionEnd(line: string, startIndex: number): number {
  const remaining = line.slice(startIndex);
  const autolinkMatch =
    AUTOLINK_URI_RE.exec(remaining) ?? AUTOLINK_EMAIL_RE.exec(remaining);
  if (autolinkMatch) {
    return startIndex + autolinkMatch[0].length;
  }

  if (remaining.startsWith(HTML_COMMENT_START)) {
    const commentEnd = remaining.indexOf(HTML_COMMENT_END);
    if (commentEnd >= 0) {
      return startIndex + commentEnd + HTML_COMMENT_END.length;
    }
    return -1;
  }

  const tagMatch = HTML_TAG_RE.exec(remaining);
  if (!tagMatch) {
    return -1;
  }
  const openMatch = HTML_OPEN_TAG_RE.exec(remaining);
  const tagName = openMatch?.[1];
  if (
    !tagName ||
    isSelfClosingHtmlTag(remaining) ||
    HTML_VOID_TAGS.has(tagName.toLowerCase())
  ) {
    return startIndex + tagMatch[0].length;
  }

  const closingTag = `</${tagName.toLowerCase()}>`;
  const closingIndex = remaining.toLowerCase().indexOf(closingTag);
  if (closingIndex < 0) {
    return startIndex + tagMatch[0].length;
  }

  return startIndex + closingIndex + closingTag.length;
}

/** Determines whether a dollar sign is more likely money than math. */
function shouldEscapeCurrencyDollar(source: string, index: number): boolean {
  if (isEscaped(source, index)) {
    return false;
  }
  if (source.charAt(index - 1) === "$" || source.charAt(index + 1) === "$") {
    return false;
  }
  if (!isDigit(source.charAt(index + 1))) {
    return false;
  }

  const closingIndex = findClosingSingleDollar(source, index + 1);
  if (closingIndex < 0) {
    return true;
  }
  if (isDigit(source.charAt(closingIndex + 1))) {
    return true;
  }

  return !isPlausibleMathContent(source.slice(index + 1, closingIndex));
}

/** Finds the next unescaped single-dollar delimiter on the same line. */
function findClosingSingleDollar(source: string, startIndex: number): number {
  let index = startIndex;
  while (index < source.length) {
    if (
      source.charAt(index) === "$" &&
      source.charAt(index - 1) !== "$" &&
      source.charAt(index + 1) !== "$" &&
      !WHITESPACE_RE.test(source.charAt(index - 1)) &&
      !isEscaped(source, index)
    ) {
      return index;
    }

    index += 1;
  }

  return -1;
}

/** Checks whether a backslash escape applies at the supplied index. */
function isEscaped(source: string, index: number): boolean {
  let backslashCount = 0;
  let cursor = index - 1;
  while (cursor >= 0 && source.charAt(cursor) === "\\") {
    backslashCount += 1;
    cursor -= 1;
  }

  return backslashCount % 2 === 1;
}

/** Checks for an ASCII digit. */
function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
}

/** Classifies an already-closed numeric-leading dollar span. */
function isPlausibleMathContent(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (hasUnescapedDollar(trimmed)) {
    return false;
  }
  if (LATEX_COMMAND_RE.test(trimmed)) {
    return true;
  }
  if (!WHITESPACE_RE.test(trimmed)) {
    return true;
  }
  if (hasLongPlainWord(trimmed)) {
    return false;
  }
  if (MATH_SIGNAL_RE.test(trimmed)) {
    return true;
  }

  return (
    NUMERIC_EXPRESSION_RE.test(trimmed) || NUMBER_VARIABLE_RE.test(trimmed)
  );
}

/** Checks whether already-selected math content contains a raw dollar sign. */
function hasUnescapedDollar(content: string): boolean {
  let index = 0;
  while (index < content.length) {
    if (content.charAt(index) === "$" && !isEscaped(content, index)) {
      return true;
    }
    index += 1;
  }

  return false;
}

/** Checks whether the content contains prose-like words outside commands. */
function hasLongPlainWord(content: string): boolean {
  return LONG_PLAIN_WORD_RE.test(content.replace(LATEX_COMMAND_GLOBAL_RE, ""));
}

// Single-dollar text math stays enabled; renderers call
// `prepareMarkdownMathSource` first so currency literals such as
// `$100M ... $2B` stay plain text rather than parsing as math.
export const mathRemarkPlugins: NonNullable<Options["remarkPlugins"]> = [
  [remarkMath, { singleDollarTextMath: true }],
];

export const mathRehypePlugins: NonNullable<Options["rehypePlugins"]> = [
  [rehypeKatex, { strict: "ignore", output: "htmlAndMathml" }],
];
