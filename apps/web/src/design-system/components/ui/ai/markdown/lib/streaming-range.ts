import type { Plugin } from "unified";

export type SourceRange = {
  readonly end: number;
  readonly start: number;
};

type PositionPoint = {
  readonly column: number;
  readonly line: number;
  readonly offset?: number;
};

type NodePosition = {
  readonly end: PositionPoint;
  readonly start: PositionPoint;
};

type MarkdownNode = {
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
  position?: NodePosition;
  type: string;
  value?: string;
};

type MarkdownRoot = MarkdownNode & {
  children: MarkdownNode[];
};

type StreamingRangeOptions = {
  readonly range: SourceRange | null;
};

const SKIPPED_PARENT_TYPES = new Set([
  "code",
  "html",
  "inlineCode",
  "table",
  "tableCell",
  "tableRow",
]);

const STREAMING_TOKEN_NODE_TYPE = "streamingToken";
const STREAMING_TOKEN_ATTRIBUTE = "data-streaming-token";

/** One word with its surrounding whitespace, or a standalone whitespace run. */
const WORD_UNIT_RE = /\s*\S+\s*|\s+/g;

/** Returns whether `range` contains at least one source character. */
export function hasSourceRange(
  range: SourceRange | null,
): range is SourceRange {
  return range !== null && range.end > range.start;
}

/** Returns whether two half-open source ranges overlap. */
function rangesOverlap(a: SourceRange, b: SourceRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Reads the source range covered by one markdown node. */
function readNodeRange(node: MarkdownNode): SourceRange | null {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number" || end <= start) {
    return null;
  }
  return { start, end };
}

/** Builds a custom mdast node that renders as a sanitized streaming span. */
function createStreamingTokenNode(value: string): MarkdownNode {
  return {
    type: STREAMING_TOKEN_NODE_TYPE,
    data: {
      hName: "span",
      hProperties: { [STREAMING_TOKEN_ATTRIBUTE]: "true" },
    },
    children: [{ type: "text", value }],
  };
}

/** Splits active text into per-word units so each word animates independently. */
function splitIntoWordUnits(text: string): string[] {
  return text.match(WORD_UNIT_RE) ?? [text];
}

/** Split a text node into leading text plus one streaming marker per word in the active range. */
function splitTextNode(node: MarkdownNode, range: SourceRange): MarkdownNode[] {
  const nodeRange = readNodeRange(node);
  if (
    node.type !== "text" ||
    typeof node.value !== "string" ||
    nodeRange === null ||
    !rangesOverlap(nodeRange, range)
  ) {
    return [node];
  }

  const activeStart = Math.max(range.start, nodeRange.start) - nodeRange.start;
  const activeEnd = Math.min(range.end, nodeRange.end) - nodeRange.start;
  const before = node.value.slice(0, activeStart);
  const active = node.value.slice(activeStart, activeEnd);
  const after = node.value.slice(activeEnd);
  const nodes: MarkdownNode[] = [];
  if (before) {
    nodes.push({ ...node, value: before });
  }
  if (active) {
    for (const unit of splitIntoWordUnits(active)) {
      nodes.push(createStreamingTokenNode(unit));
    }
  }
  if (after) {
    nodes.push({ ...node, value: after });
  }
  return nodes;
}

/** Recursively marks text nodes overlapping the active streaming source range, leaving unanimatable containers untouched. */
function markStreamingRange(
  parent: MarkdownRoot | MarkdownNode,
  range: SourceRange,
  parentSkipped = false,
): void {
  if (!parent.children) {
    return;
  }

  const nextChildren: MarkdownNode[] = [];
  for (const child of parent.children) {
    const skipped = parentSkipped || SKIPPED_PARENT_TYPES.has(child.type);
    if (skipped) {
      nextChildren.push(child);
      continue;
    }
    if (child.type === "text") {
      nextChildren.push(...splitTextNode(child, range));
      continue;
    }
    markStreamingRange(child, range, skipped);
    nextChildren.push(child);
  }
  parent.children = nextChildren;
}

/** Remark plugin that wraps the active appended source range in marker nodes. */
export const remarkStreamingRange: Plugin<
  [StreamingRangeOptions],
  MarkdownRoot
> = (options) => (tree) => {
  if (!hasSourceRange(options.range)) {
    return;
  }
  markStreamingRange(tree, options.range);
};
