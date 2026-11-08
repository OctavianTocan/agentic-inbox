import type { ComponentProps } from "react";

/**
 * Wraps a markdown `<table>` in a horizontally scrollable bordered card.
 *
 * Vertical spacing is set in CSS via `[data-slot="markdown-table"]` so
 * each prose flavour (`.prose`, `.prose-chat`) can pick its own rhythm.
 */
export function MarkdownTable({
  node: _node,
  ...props
}: ComponentProps<"table"> & { node?: unknown }) {
  return (
    <div
      className="w-full overflow-x-auto rounded-md border"
      data-slot="markdown-table"
    >
      <table {...props} />
    </div>
  );
}
