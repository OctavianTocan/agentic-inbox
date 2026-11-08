"use client";

import type React from "react";
import {
  type ComponentPropsWithoutRef,
  type ElementType,
  memo,
  useMemo,
} from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remend from "remend";
import { cn } from "../../../lib/utils";
import { MarkdownCodeBlock } from "./markdown-code-block";
import { MarkdownDetails, MarkdownSummary } from "./markdown-details";
import { htmlRehypePlugins } from "./markdown-html";
import { MarkdownImage } from "./markdown-image";
import {
  mathRehypePlugins,
  mathRemarkPlugins,
  prepareMarkdownMathSource,
} from "./markdown-math";
import { MarkdownPre } from "./markdown-pre";
import { MarkdownTable } from "./markdown-table";

const DEFAULT_REMARK_PLUGINS: Options["remarkPlugins"] = [
  remarkGfm,
  ...mathRemarkPlugins,
];
const DEFAULT_REHYPE_PLUGINS: Options["rehypePlugins"] = [
  ...htmlRehypePlugins,
  ...mathRehypePlugins,
];

const BASE_COMPONENTS: Partial<Components> = {
  code: (props) => <MarkdownCodeBlock {...props} />,
  pre: (props) => <MarkdownPre {...props} />,
  a: ({ className, children, href, ...props }) => (
    <a className={cn("underline-offset-2", className)} href={href} {...props}>
      {children}
    </a>
  ),
  img: (props) => <MarkdownImage {...props} />,
  details: (props) => <MarkdownDetails {...props} />,
  summary: MarkdownSummary,
  table: MarkdownTable,
};

export type MarkdownProps<T extends ElementType = "div"> = Options & {
  as?: T;
  containerRef?: React.Ref<HTMLElement>;
  containerProps?: ComponentPropsWithoutRef<T>;
};

/** Renders markdown into a configurable container with the shared component map. */
function MarkdownInner<T extends ElementType = "div">({
  components,
  as,
  containerRef,
  containerProps,
  remarkPlugins = DEFAULT_REMARK_PLUGINS,
  rehypePlugins = DEFAULT_REHYPE_PLUGINS,
  ...reactMarkdownProps
}: MarkdownProps<T>) {
  const Component = (as || "div") as ElementType;

  const processedContent = useMemo(() => {
    if (typeof reactMarkdownProps.children === "string") {
      return prepareMarkdownMathSource(remend(reactMarkdownProps.children));
    }
    return reactMarkdownProps.children;
  }, [reactMarkdownProps.children]);

  const mergedComponents = useMemo<Partial<Components>>(
    () => ({ ...BASE_COMPONENTS, ...components }),
    [components],
  );

  return (
    <Component
      ref={containerRef}
      {...containerProps}
      className={cn(
        "prose dark:prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0",
        containerProps?.className,
      )}
    >
      <ReactMarkdown
        components={mergedComponents}
        rehypePlugins={rehypePlugins}
        remarkPlugins={remarkPlugins}
        {...reactMarkdownProps}
      >
        {processedContent}
      </ReactMarkdown>
    </Component>
  );
}

/** Renders markdown into a configurable container with the shared component map. */
export const Markdown = memo(MarkdownInner) as <T extends ElementType = "div">(
  props: MarkdownProps<T> & { ref?: React.Ref<HTMLElement> },
) => React.ReactElement | null;
