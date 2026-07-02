import type { Element, Root } from "hast";
import type { Schema } from "hast-util-sanitize";
import type { Options } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const EXTRA_TAGS = ["mark", "u", "abbr", "small"] as const;

const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), ...EXTRA_TAGS],
  attributes: {
    ...defaultSchema.attributes,
    // `defaultSchema` restricts `code.className` to `/^language-./`. Allow the
    // `math-inline` / `math-display` markers `mdast-util-to-hast` adds to math
    // nodes so `rehype-katex` keeps its display-mode signal even after sanitize.
    code: [["className", /^language-./, "math-inline", "math-display"]],
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
    abbr: [...(defaultSchema.attributes?.abbr ?? []), "title"],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "data-streaming-token",
      "dataStreamingToken",
    ],
    // No `className` on `<sup>`, `<sub>`, `<kbd>`, `<mark>`, `<u>`, `<small>`,
    // `<ins>`, `<span>`, or `<div>` — letting markdown attach host utility
    // classes (e.g. `fixed`, `inset-0`, `z-50`) would re-introduce a
    // UI-spoofing surface even with `style` blocked. KaTeX renders after
    // sanitize, so its own span/div nodes are not subject to this allowlist.
  },
};

const FRAGMENT_RE = /^#(.+)$/;

/**
 * Re-align in-document anchor hrefs with sanitize-clobbered ids.
 *
 * `rehype-sanitize`'s default `clobber` option renames `id` / `name`
 * attribute values by prepending `clobberPrefix` (`user-content-` by
 * default). It does not modify `href` values, so any anchor pointing at an
 * id whose name was clobbered would resolve to nowhere — most visibly the
 * GFM footnote refs (`<a href="#fn-1">` / `<li id="user-content-fn-1">`).
 */
const rehypeRealignClobberedAnchors: Plugin<[], Root> = () => (tree) => {
  const ids = new Set<string>();
  visit(tree, "element", (node: Element) => {
    const id = node.properties?.id;
    if (typeof id === "string") {
      ids.add(id);
    }
  });
  const prefix = defaultSchema.clobberPrefix ?? "user-content-";
  visit(tree, "element", (node: Element) => {
    if (node.tagName !== "a" || !node.properties) {
      return;
    }
    const href = node.properties.href;
    if (typeof href !== "string") {
      return;
    }
    const match = FRAGMENT_RE.exec(href);
    if (!match) {
      return;
    }
    const target = match[1];
    if (!target || ids.has(target)) {
      return;
    }
    const prefixed = `${prefix}${target}`;
    if (ids.has(prefixed)) {
      node.properties.href = `#${prefixed}`;
    }
  });
};

export const htmlRehypePlugins: NonNullable<Options["rehypePlugins"]> = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  rehypeRealignClobberedAnchors,
];
