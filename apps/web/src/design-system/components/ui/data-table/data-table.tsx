// @ts-nocheck
"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";
import { Fragment } from "react";
import { cn } from "../../../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";
import type { DataTableActionBarProps } from "./data-table-action-bar";
import type { DataTablePaginationProps } from "./data-table-pagination";
import type { DataTableToolbarProps } from "./data-table-toolbar";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  rowComponent?: React.ReactNode;
  toolbarComponent?: React.ComponentType<DataTableToolbarProps<TData>>;
  actionBar?: React.ComponentType<DataTableActionBarProps<TData>>;
  paginationComponent?: React.ComponentType<DataTablePaginationProps<TData>>;
  onRowClick?: (row: Row<TData>) => void;
  defaultSorting?: SortingState;
  defaultColumnVisibility?: VisibilityState;
  defaultColumnFilters?: ColumnFiltersState;
  className?: string;
  tableClassName?: string;
  tableContainerClassName?: string;

  /** access the state from the parent component */
  columnFilters?: ColumnFiltersState;
  setColumnFilters?: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
}

const EMPTY_SORTING: SortingState = [];
const EMPTY_VISIBILITY: VisibilityState = {};
const EMPTY_COLUMN_FILTERS: ColumnFiltersState = [];

/** Configurable data table with sorting, filtering, pagination, and row selection. */
export function DataTable<TData, TValue>({
  columns,
  data,
  rowComponent,
  toolbarComponent,
  actionBar,
  paginationComponent,
  onRowClick,
  defaultSorting = EMPTY_SORTING,
  defaultColumnVisibility = EMPTY_VISIBILITY,
  defaultColumnFilters = EMPTY_COLUMN_FILTERS,
  className,
  tableClassName,
  tableContainerClassName,
  columnFilters,
  setColumnFilters,
  sorting,
  setSorting,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>(defaultColumnFilters);
  const [internalSorting, setInternalSorting] =
    React.useState<SortingState>(defaultSorting);

  const columnFiltersState = columnFilters ?? internalColumnFilters;
  const setColumnFiltersState = setColumnFilters ?? setInternalColumnFilters;
  const sortingState = sorting ?? internalSorting;
  const setSortingState = setSorting ?? setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sortingState,
      columnVisibility,
      rowSelection,
      columnFilters: columnFiltersState,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSortingState,
    onColumnFiltersChange: setColumnFiltersState,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
    // @ts-expect-error as we have an id in the data
    getRowCanExpand: (row) => Boolean(row.original.id),
  });

  return (
    <div className={cn("grid gap-2", className)}>
      {toolbarComponent
        ? React.createElement(toolbarComponent, { table })
        : null}
      <div className={cn(tableContainerClassName)}>
        <Table className={cn("rounded-md border", tableClassName)}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      className={header.column.columnDef.meta?.headerClassName}
                      colSpan={header.colSpan}
                      key={header.id}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="data-[state=selected]:bg-muted/50"
                    data-state={
                      (row.getIsSelected() || row.getIsExpanded()) && "selected"
                    }
                    onClick={() => onRowClick?.(row)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className={cell.column.columnDef.meta?.cellClassName}
                        key={cell.id}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow className="hover:bg-background">
                      <TableCell
                        className="p-0"
                        colSpan={row.getVisibleCells().length}
                      >
                        {rowComponent}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={columns.length}
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {actionBar ? React.createElement(actionBar, { table }) : null}
        </Table>
      </div>
      {paginationComponent
        ? React.createElement(paginationComponent, { table })
        : null}
    </div>
  );
}
