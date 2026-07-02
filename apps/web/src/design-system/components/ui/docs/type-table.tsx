import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";

type TypeNode = {
  readonly description?: ReactNode;
  readonly type: string;
  readonly default?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
};

type TypeTableProps = {
  readonly type: Record<string, TypeNode>;
};

/**
 * Three-column reference table for documenting object/component prop shapes.
 * Each row shows the field name (with required marker), its type, default, and description.
 *
 * @param props - Type table props.
 * @param props.type - Map of field name to its `TypeNode` definition.
 * @returns The rendered reference table.
 */
export function TypeTable({ type }: TypeTableProps) {
  return (
    <div
      className="not-prose my-6 overflow-x-auto rounded-lg border"
      data-slot="docs-type-table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(type).map(([name, node]) => (
            <TableRow key={name}>
              <TableCell className="font-mono text-xs">
                <span
                  className={
                    node.deprecated ? "text-muted-foreground line-through" : ""
                  }
                >
                  {name}
                </span>
                {node.required && (
                  <span aria-label="required" className="text-destructive">
                    *
                  </span>
                )}
              </TableCell>
              <TableCell className="font-mono text-muted-foreground text-xs">
                {node.type}
              </TableCell>
              <TableCell className="font-mono text-muted-foreground text-xs">
                {node.default ?? "-"}
              </TableCell>
              <TableCell className="text-sm">{node.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
