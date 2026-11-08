import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../breadcrumb";

export type BreadcrumbsItem = {
  readonly name: string;
  readonly url?: string;
};

type BreadcrumbsProps = {
  readonly items: readonly BreadcrumbsItem[];
};

/**
 * Renders an ordered breadcrumb trail. Items with `url` become Next.js links;
 * the final item (or any item without `url`) renders as the current page.
 *
 * @param props - Breadcrumb props.
 * @param props.items - Ordered ancestor list. Last item is treated as the current page.
 * @returns The rendered breadcrumb nav, or null when no items are provided.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <Breadcrumb data-slot="docs-breadcrumbs">
      <BreadcrumbList>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Fragment key={item.url ?? item.name}>
              <BreadcrumbItem>
                {isLast || !item.url ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={item.url} />}>
                    {item.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
