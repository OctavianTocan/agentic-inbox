"use client";

import { cn } from "../../../../lib/utils";
import { Badge } from "../../badge";

type DataTableTagsCellProps = React.ComponentProps<"div"> & {
  tags?: string[] | null;
  maxVisible?: number; // show +N when overflowing
};

/** Table cell rendering tag badges, collapsing any beyond the visible limit into a +N badge. */
export function DataTableTagsCell({
  tags,
  maxVisible = 3,
  className,
  ...props
}: DataTableTagsCellProps) {
  const list = Array.isArray(tags) ? tags : [];
  const visible = list.slice(0, maxVisible);
  const overflow = list.length - visible.length;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      {...props}
    >
      {visible.map((t) => (
        <Badge className="px-1.5 text-[10px]" key={t} variant="secondary">
          {t}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge className="px-1.5 text-[10px]" variant="outline">
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}

export type { DataTableTagsCellProps };
