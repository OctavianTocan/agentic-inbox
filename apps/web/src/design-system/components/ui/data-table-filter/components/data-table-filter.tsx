"use client";

import { useIsMobile } from "@/design-system/hooks/use-mobile";
import type {
  Column,
  DataTableFilterActions,
  FilterStrategy,
  FiltersState,
} from "../core/types";
import type { Locale } from "../lib/i18n";
import { ActiveFilters, ActiveFiltersMobileContainer } from "./active-filters";
import { FilterActions } from "./filter-actions";
import { FilterSelector } from "./filter-selector";

interface DataTableFilterProps<TData> {
  columns: Column<TData>[];
  filters: FiltersState;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

/** Filter bar: a column selector, clear action, and the active-filter chips, responsive to mobile. */
export function DataTableFilter<TData>({
  columns,
  filters,
  actions,
  strategy,
  locale = "en",
}: DataTableFilterProps<TData>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex shrink-0 gap-1">
          <FilterSelector
            columns={columns}
            filters={filters}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
          <FilterActions
            hasFilters={filters.length > 0}
            actions={actions}
            locale={locale}
          />
        </div>
        <ActiveFiltersMobileContainer>
          <ActiveFilters
            columns={columns}
            filters={filters}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
        </ActiveFiltersMobileContainer>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <FilterSelector
          columns={columns}
          filters={filters}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
        <FilterActions
          hasFilters={filters.length > 0}
          actions={actions}
          locale={locale}
        />
      </div>
      {filters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ActiveFilters
            columns={columns}
            filters={filters}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
        </div>
      ) : null}
    </div>
  );
}
