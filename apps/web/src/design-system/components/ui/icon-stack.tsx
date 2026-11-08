import { isValidElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export type IconStackProps = {
  /** One pre-rendered glyph per cell — e.g. an `<Icon />` or `<img />`. */
  items: readonly ReactNode[];
  className?: string;
};

/** Overlapping row of small glyph cells; renders nothing when `items` is empty. */
export function IconStack({ items, className }: IconStackProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <span className={cn("flex items-center -space-x-1", className)}>
      {items.map((item, i) => (
        <span
          className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-background"
          key={
            isValidElement(item) && item.key != null ? item.key : `icon-${i}`
          }
        >
          {item}
        </span>
      ))}
    </span>
  );
}
