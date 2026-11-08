"use client";

import type { TableOfContents } from "fumadocs-core/toc";

import { ChevronDownIcon } from "../../../components/icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";

type InlineTOCProps = {
  readonly items: TableOfContents;
};

/**
 * Collapsible inline "On this page" panel embedded inside a doc body.
 * Useful at the top of long pages where the sticky TOC is hidden.
 *
 * @param props - Inline TOC props.
 * @param props.items - Heading list. Each item carries `title`, `url`, and `depth`.
 * @returns The rendered collapsible TOC.
 */
export function InlineTOC({ items }: InlineTOCProps) {
  return (
    <Collapsible
      className="not-prose my-6 rounded-lg border bg-card text-card-foreground"
      data-slot="docs-inline-toc"
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 font-medium text-sm">
        On this page
        <ChevronDownIcon className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="border-t p-2">
          {items.map((item) => (
            <li
              key={item.url}
              style={{ paddingInlineStart: 12 * Math.max(item.depth - 1, 0) }}
            >
              <a
                className="block rounded px-2 py-1 text-muted-foreground text-sm hover:bg-accent hover:text-accent-foreground"
                href={item.url}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
