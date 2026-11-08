"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

type DocsTabsProps = {
  readonly items: readonly string[];
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Renders MDX `<Tabs items={[...]}>` with a line-style tab strip.
 * Returns null when `items` is empty.
 *
 * @param props - Tabs configuration.
 * @param props.items - Ordered list of tab labels (also used as values).
 * @param props.children - `DocsTab` panels matching `items` by `value`.
 * @param props.className - Extra classes merged onto the tabs root.
 * @returns The rendered tabs, or null when no items are provided.
 */
export function DocsTabs({ items, children, className }: DocsTabsProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <Tabs className={className} data-slot="docs-tabs" defaultValue={items[0]}>
      <TabsList variant="line">
        {items.map((item) => (
          <TabsTrigger key={item} value={item}>
            {item}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

type DocsTabProps = {
  readonly value: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Single tab panel rendered inside `DocsTabs`. Matches `DocsTabs.items` by value.
 *
 * @param props - Tab panel props.
 * @param props.value - Identifier matching one of the parent `items`.
 * @param props.children - Panel contents.
 * @param props.className - Extra classes merged onto the panel.
 * @returns The rendered tab panel.
 */
export function DocsTab({ value, children, className }: DocsTabProps) {
  return (
    <TabsContent className={className} data-slot="docs-tab" value={value}>
      {children}
    </TabsContent>
  );
}
