import type * as React from "react";
import { cn } from "../../../lib/utils";
import { Skeleton } from "../skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";

interface DataTableSkeletonProps extends React.ComponentProps<"div"> {
  columnCount: number;
  rowCount?: number;
  filterCount?: number;
  cellWidths?: string[];
  withViewOptions?: boolean;
  withPagination?: boolean;
  shrinkZero?: boolean;
  tableContainerClassName?: string;
}

/** Loading placeholder mirroring the data table layout, with optional toolbar and pagination skeletons. */
export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  filterCount = 0,
  cellWidths = ["auto"],
  withViewOptions = true,
  withPagination = true,
  shrinkZero = false,
  tableContainerClassName,
  className,
  ...props
}: DataTableSkeletonProps) {
  const cozyCellWidths = Array.from(
    { length: columnCount },
    (_, idx) => cellWidths[idx % cellWidths.length] ?? "auto",
  );
  const filterSkeletonKeys = Array.from(
    { length: filterCount },
    (_, idx) => `filter-${idx}`,
  );
  const columnSkeletons = Array.from({ length: columnCount }, (_, idx) => ({
    key: `column-${idx}`,
    width: cozyCellWidths[idx],
  }));
  const rowSkeletonKeys = Array.from(
    { length: rowCount },
    (_, idx) => `row-${idx}`,
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
      {...props}
    >
      <div className="flex w-full items-center justify-between gap-2 overflow-auto p-1">
        <div className="flex flex-1 items-center gap-2">
          {filterSkeletonKeys.map((filterKey) => (
            <Skeleton
              className="h-7 w-[4.5rem] border-dashed"
              key={filterKey}
            />
          ))}
        </div>
        {withViewOptions && (
          <Skeleton className="ml-auto hidden h-7 w-[4.5rem] lg:flex" />
        )}
      </div>
      <div className={cn("rounded-md border", tableContainerClassName)}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columnSkeletons.map(({ key, width }) => (
                <TableHead
                  key={key}
                  style={{
                    width,
                    minWidth: shrinkZero ? width : "auto",
                  }}
                >
                  <Skeleton className="h-6 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowSkeletonKeys.map((rowKey) => (
              <TableRow className="hover:bg-transparent" key={rowKey}>
                {columnSkeletons.map(({ key, width }) => (
                  <TableCell
                    key={`${rowKey}-${key}`}
                    style={{
                      width,
                      minWidth: shrinkZero ? width : "auto",
                    }}
                  >
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {withPagination && (
        <div className="flex w-full items-center justify-between gap-4 overflow-auto p-1 sm:gap-8">
          <Skeleton className="h-7 w-40 shrink-0" />
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-[4.5rem]" />
            </div>
            <div className="flex items-center justify-center font-medium text-sm">
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="hidden size-7 lg:block" />
              <Skeleton className="size-7" />
              <Skeleton className="size-7" />
              <Skeleton className="hidden size-7 lg:block" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
