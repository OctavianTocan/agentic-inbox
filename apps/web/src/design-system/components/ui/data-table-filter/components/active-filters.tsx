import { useEffect, useRef, useState } from "react";
import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterModel,
  FilterStrategy,
  FiltersState,
} from "../core/types";
import { getColumn } from "../lib/helpers";
import type { Locale } from "../lib/i18n";
import { FilterOperator } from "./filter-operator";
import { FilterSubject } from "./filter-subject";
import { FilterValue } from "./filter-value";

interface ActiveFiltersProps<TData> {
  columns: Column<TData>[];
  filters: FiltersState;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

/** Renders the active-filter chips for every filter currently in state. */
export function ActiveFilters<TData>({
  columns,
  filters,
  actions,
  strategy,
  locale = "en",
}: ActiveFiltersProps<TData>) {
  return (
    <>
      {filters.map((filter) => {
        const id = filter.columnId;

        const column = getColumn(columns, id);

        if (!filter.values) return null;

        return (
          <ActiveFilter
            key={`active-filter-${filter.columnId}`}
            filter={filter}
            column={column}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
        );
      })}
    </>
  );
}

interface ActiveFilterProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

/** Renders a single active-filter chip: subject, operator, and value. */
export function ActiveFilter<TData, TType extends ColumnDataType>({
  filter,
  column,
  actions,
  strategy,
  locale = "en",
}: ActiveFilterProps<TData, TType>) {
  return (
    <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-border bg-input text-xs">
      <FilterSubject column={column} />
      <div className="w-px shrink-0 bg-border" />
      <FilterOperator
        filter={filter}
        column={column}
        actions={actions}
        locale={locale}
      />
      <div className="w-px shrink-0 bg-border" />
      <FilterValue
        filter={filter}
        column={column}
        actions={actions}
        strategy={strategy}
        locale={locale}
      />
    </div>
  );
}

/** Horizontally scrollable container that fades edges when chips overflow on mobile. */
export function ActiveFiltersMobileContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftBlur, setShowLeftBlur] = useState(false);
  const [showRightBlur, setShowRightBlur] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;

      setShowLeftBlur(scrollLeft > 0);

      // 1px buffer absorbs sub-pixel rounding so the edge fade clears at the end.
      setShowRightBlur(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (scrollContainerRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(scrollContainerRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
    return undefined;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    checkScroll();
  }, [children]);

  return (
    <div className="relative w-full overflow-x-hidden">
      {showLeftBlur && (
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent animate-in fade-in-0" />
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-scroll no-scrollbar"
        onScroll={checkScroll}
      >
        {children}
      </div>

      {showRightBlur && (
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent animate-in fade-in-0 " />
      )}
    </div>
  );
}
