// @ts-nocheck
"use client";

import type { Column, Table } from "@tanstack/react-table";
import * as React from "react";
import { cn } from "../../../lib/utils";
import { CloseIcon } from "../../icons";
import { Button } from "../button";
import { Input } from "../input";
import { DataTableDateFilter } from "./data-table-date-filter";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableSliderFilter } from "./data-table-slider-filter";
import { DataTableViewOptions } from "./data-table-view-options";

export interface DataTableToolbarProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
}

/** Filter and view-options bar rendered above a `DataTable`. */
export function DataTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-start justify-between gap-2 p-1",
        className,
      )}
      role="toolbar"
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter column={column} key={column.id} />
        ))}
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            className="border-dashed"
            onClick={onReset}
            size="sm"
            variant="outline"
          >
            <CloseIcon />
            Reset
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

/** Renders the filter control matching a column's configured filter variant. */
function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  {
    const columnMeta = column.columnDef.meta;

    const onFilterRender = React.useCallback(() => {
      if (!columnMeta?.variant) {
        return null;
      }

      switch (columnMeta.variant) {
        case "text":
          return (
            <Input
              className="h-8 w-40 lg:w-56"
              onChange={(event) => column.setFilterValue(event.target.value)}
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ""}
            />
          );

        case "number":
          return (
            <div className="relative">
              <Input
                className={cn("h-8 w-[120px]", columnMeta.unit && "pr-8")}
                inputMode="numeric"
                onChange={(event) => column.setFilterValue(event.target.value)}
                placeholder={columnMeta.placeholder ?? columnMeta.label}
                type="number"
                value={(column.getFilterValue() as string) ?? ""}
              />
              {columnMeta.unit && (
                <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                  {columnMeta.unit}
                </span>
              )}
            </div>
          );

        case "range":
          return (
            <DataTableSliderFilter
              column={column}
              title={columnMeta.label ?? column.id}
            />
          );

        case "date":
        case "dateRange":
          return (
            <DataTableDateFilter
              column={column}
              multiple={columnMeta.variant === "dateRange"}
              title={columnMeta.label ?? column.id}
            />
          );

        case "select":
        case "multiSelect":
          return (
            <DataTableFacetedFilter
              column={column}
              multiple={columnMeta.variant === "multiSelect"}
              options={columnMeta.options ?? []}
              title={columnMeta.label ?? column.id}
            />
          );

        default:
          return null;
      }
    }, [column, columnMeta]);

    return onFilterRender();
  }
}
