import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";

type AccordionsProps = {
  readonly multiple?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Container for one or more `DocsAccordion` items. Defaults to single-open behavior;
 * pass `multiple` to allow several items expanded at once.
 *
 * @param props - Accordion root props.
 * @param props.multiple - When true, more than one item can be open simultaneously.
 * @param props.children - One or more `DocsAccordion` items.
 * @param props.className - Extra classes merged onto the container.
 * @returns The rendered accordion list.
 */
export function Accordions({
  multiple = false,
  children,
  className,
}: AccordionsProps) {
  return (
    <Accordion
      className={cn("not-prose my-6 rounded-lg border bg-card", className)}
      data-slot="docs-accordions"
      multiple={multiple}
    >
      {children}
    </Accordion>
  );
}

type DocsAccordionProps = {
  readonly title: ReactNode;
  readonly value?: string;
  readonly children: ReactNode;
};

/**
 * Accordion item with a `title` header. Pair with `Accordions`.
 *
 * @param props - Accordion item props.
 * @param props.title - Header content shown in the trigger.
 * @param props.value - Stable identifier used by the accordion root. Defaults to the title.
 * @param props.children - Panel body content.
 * @returns The rendered accordion item.
 */
export function DocsAccordion({ title, value, children }: DocsAccordionProps) {
  return (
    <AccordionItem
      data-slot="docs-accordion-item"
      value={value ?? String(title)}
    >
      <AccordionTrigger className="px-3">{title}</AccordionTrigger>
      <AccordionContent className="px-3">{children}</AccordionContent>
    </AccordionItem>
  );
}
