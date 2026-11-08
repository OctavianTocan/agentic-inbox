"use client";

import type { Table } from "@tanstack/react-table";
import { CloseIcon } from "../../icons";
import { Button } from "../button";
import { Input } from "../input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableViewOptions } from "./data-table-view-options";

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

/** Filter and view-options bar rendered above a `DataTable`. */
export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const statusColumn = table.getColumn("status");
  const tagsColumn = table.getColumn("tags");

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-x-2">
        <Input
          className="h-8 w-[150px] lg:w-[250px]"
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          placeholder="Filter entries..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
        />
        {statusColumn && (
          <DataTableFacetedFilter
            column={statusColumn}
            options={[]}
            title="Status"
          />
        )}
        {tagsColumn && (
          <DataTableFacetedFilter
            column={tagsColumn}
            options={[]}
            title="Tags"
          />
        )}
        {isFiltered && (
          <Button
            className="h-8 px-2 lg:px-3"
            onClick={() => table.resetColumnFilters()}
            variant="ghost"
          >
            Reset
            <CloseIcon />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
