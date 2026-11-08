"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { createColumns } from "../core/filters";
import { DEFAULT_OPERATORS, determineNewOperator } from "../core/operators";
import type {
  Column,
  ColumnConfig,
  ColumnDataType,
  ColumnOption,
  DataTableFilterActions,
  FilterModel,
  FilterStrategy,
  FiltersState,
  NumberColumnIds,
  OptionBasedColumnDataType,
  OptionColumnIds,
} from "../core/types";
import { addUniq, removeUniq, uniq } from "../lib/array";
import {
  createDateFilterValue,
  createNumberFilterValue,
  isColumnOptionArray,
  isColumnOptionMap,
  isMinMaxTuple,
} from "../lib/helpers";

type DataTableFiltersBaseOptions<
  TData,
  TColumns extends ReadonlyArray<ColumnConfig<TData, any, any, any>>,
  TStrategy extends FilterStrategy,
> = {
  strategy: TStrategy;
  data: TData[];
  columnsConfig: TColumns;
  options?: Partial<
    Record<OptionColumnIds<TColumns>, ColumnOption[] | undefined>
  >;
  faceted?: Partial<
    | Record<OptionColumnIds<TColumns>, Map<string, number> | undefined>
    | Record<NumberColumnIds<TColumns>, [number, number] | undefined>
  >;
};

type ControlledFiltersOptions = {
  filters: FiltersState;
  onFiltersChange: React.Dispatch<React.SetStateAction<FiltersState>>;
  defaultFilters?: never;
};

type UncontrolledFiltersOptions = {
  filters?: never;
  onFiltersChange?: never;
  defaultFilters?: FiltersState;
};

export type DataTableFiltersOptions<
  TData,
  TColumns extends ReadonlyArray<ColumnConfig<TData, any, any, any>>,
  TStrategy extends FilterStrategy,
> = DataTableFiltersBaseOptions<TData, TColumns, TStrategy> &
  (ControlledFiltersOptions | UncontrolledFiltersOptions);

type UseDataTableFiltersResult<TData> = {
  columns: Column<TData>[];
  filters: FiltersState;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
};

/** Indexes a partial record by string id, ignoring narrow key types. */
function lookup<T>(
  record: Partial<Record<string, T | undefined>> | undefined,
  id: string,
): T | undefined {
  return record?.[id];
}

/** Type-erased lookup into the heterogeneous faceted-options union; guards narrow the result. */
function facetedEntry(
  faceted: Readonly<Record<string, unknown>> | undefined,
  id: string,
): unknown {
  return faceted?.[id];
}

/**
 * Headless filter-state engine: takes a column-config tuple and returns the
 * resolved `Column[]`, the active filter list, and a stable `actions` object.
 *
 * @template TData - The row type the columns operate over.
 * @template TColumns - The literal-typed tuple of column configs.
 * @template TStrategy - `'client'` or `'server'`.
 * @param props - Strategy, data, column configs, and optional controlled state.
 * @returns Resolved columns, current filter list, actions, and strategy.
 */
export function useDataTableFilters<
  TData,
  TColumns extends ReadonlyArray<ColumnConfig<TData, any, any, any>>,
  TStrategy extends FilterStrategy,
>(
  props: DataTableFiltersOptions<TData, TColumns, TStrategy>,
): UseDataTableFiltersResult<TData> {
  const {
    strategy,
    data,
    columnsConfig,
    defaultFilters,
    filters: externalFilters,
    onFiltersChange,
    options,
    faceted,
  } = props;

  const [internalFilters, setInternalFilters] = useState<FiltersState>(
    defaultFilters ?? [],
  );

  const filters = externalFilters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;

  const columns = useMemo(() => {
    const enhancedConfigs = columnsConfig.map((config) => {
      let final = config;

      if (
        options &&
        (config.type === "option" || config.type === "multiOption")
      ) {
        const optionsInput = lookup(options, config.id);
        if (!optionsInput || !isColumnOptionArray(optionsInput)) return config;

        final = { ...final, options: optionsInput };
      }

      if (
        faceted &&
        (config.type === "option" || config.type === "multiOption")
      ) {
        const facetedOptionsInput = facetedEntry(faceted, config.id);
        if (!facetedOptionsInput || !isColumnOptionMap(facetedOptionsInput))
          return config;

        final = { ...final, facetedOptions: facetedOptionsInput };
      }

      if (config.type === "number" && faceted) {
        const minMaxTuple = facetedEntry(faceted, config.id);
        if (!minMaxTuple || !isMinMaxTuple(minMaxTuple)) return config;

        final = {
          ...final,
          min: minMaxTuple[0],
          max: minMaxTuple[1],
        };
      }

      return final;
    });

    return createColumns(data, enhancedConfigs, strategy);
  }, [data, columnsConfig, options, faceted, strategy]);

  const actions: DataTableFilterActions = useMemo(
    () => ({
      addFilterValue<TActionData, TType extends OptionBasedColumnDataType>(
        column: ColumnConfig<TActionData, TType>,
        values: FilterModel<TType>["values"],
      ): void {
        if (column.type === "option" || column.type === "multiOption") {
          setFilters((prev) =>
            applyAddFilterValue(prev, column.id, column.type, values),
          );
          return;
        }
        throw new Error(
          "[data-table-filter] addFilterValue() is only supported for option columns",
        );
      },
      removeFilterValue<TActionData, TType extends OptionBasedColumnDataType>(
        column: ColumnConfig<TActionData, TType>,
        values: FilterModel<TType>["values"],
      ): void {
        if (column.type === "option" || column.type === "multiOption") {
          setFilters((prev) =>
            applyRemoveFilterValue(prev, column.id, column.type, values),
          );
          return;
        }
        throw new Error(
          "[data-table-filter] removeFilterValue() is only supported for option columns",
        );
      },
      setFilterValue<TActionData, TType extends ColumnDataType>(
        column: ColumnConfig<TActionData, TType>,
        values: FilterModel<TType>["values"],
      ): void {
        setFilters((prev) =>
          applySetFilterValue(prev, column.id, column.type, values),
        );
      },
      setFilterOperator<TType extends ColumnDataType>(
        columnId: string,
        operator: FilterModel<TType>["operator"],
      ): void {
        setFilters((prev) =>
          prev.map((f) => (f.columnId === columnId ? { ...f, operator } : f)),
        );
      },
      removeFilter(columnId: string): void {
        setFilters((prev) => prev.filter((f) => f.columnId !== columnId));
      },
      removeAllFilters(): void {
        setFilters([]);
      },
    }),
    [setFilters],
  );

  return { columns, filters, actions, strategy };
}

/** Adds new option/multiOption values to the column's filter (unioning prior values). */
function applyAddFilterValue<TType extends OptionBasedColumnDataType>(
  prev: FiltersState,
  columnId: string,
  type: TType,
  values: FilterModel<TType>["values"],
): FiltersState {
  const filter = prev.find((f) => f.columnId === columnId);
  const isColumnFiltered = filter && filter.values.length > 0;
  if (!isColumnFiltered) {
    return [
      ...prev,
      {
        columnId,
        type,
        operator:
          values.length > 1
            ? DEFAULT_OPERATORS[type].multiple
            : DEFAULT_OPERATORS[type].single,
        values,
      },
    ];
  }
  const oldValues = filter.values;
  const newValues = addUniq(filter.values, values);
  const newOperator = determineNewOperator(
    type,
    oldValues,
    newValues,
    filter.operator,
  );
  if (newValues.length === 0) {
    return prev.filter((f) => f.columnId !== columnId);
  }
  return prev.map((f) =>
    f.columnId === columnId
      ? { columnId, type, operator: newOperator, values: newValues }
      : f,
  );
}

/** Removes option/multiOption values from a column filter; clears the filter when empty. */
function applyRemoveFilterValue<TType extends OptionBasedColumnDataType>(
  prev: FiltersState,
  columnId: string,
  type: TType,
  values: FilterModel<TType>["values"],
): FiltersState {
  const filter = prev.find((f) => f.columnId === columnId);
  const isColumnFiltered = filter && filter.values.length > 0;
  if (!isColumnFiltered) {
    return [...prev];
  }
  const newValues = removeUniq(filter.values, values);
  const oldValues = filter.values;
  const newOperator = determineNewOperator(
    type,
    oldValues,
    newValues,
    filter.operator,
  );
  if (newValues.length === 0) {
    return prev.filter((f) => f.columnId !== columnId);
  }
  return prev.map((f) =>
    f.columnId === columnId
      ? { columnId, type, operator: newOperator, values: newValues }
      : f,
  );
}

/** Replaces a column's filter values, dispatching to the per-type setter. */
function applySetFilterValue(
  prev: FiltersState,
  columnId: string,
  type: ColumnDataType,
  values: FilterModel["values"],
): FiltersState {
  switch (type) {
    case "number":
      return setNumberFilterValue(prev, columnId, values as readonly number[]);
    case "date":
      return setDateFilterValue(prev, columnId, values as readonly Date[]);
    case "option":
    case "multiOption":
    case "text":
      return setOptionLikeFilterValue(
        prev,
        columnId,
        type,
        values as readonly string[],
      );
  }
}

/** Sets a number-typed filter, deriving the min/max range when two values are provided. */
function setNumberFilterValue(
  prev: FiltersState,
  columnId: string,
  rawValues: readonly number[],
): FiltersState {
  const newValues = createNumberFilterValue([...rawValues]);
  if (newValues.length === 0) return prev;

  const filter = prev.find((f) => f.columnId === columnId);
  const isColumnFiltered = filter && filter.values.length > 0;
  if (!isColumnFiltered) {
    return [
      ...prev,
      {
        columnId,
        type: "number",
        operator:
          rawValues.length > 1
            ? DEFAULT_OPERATORS.number.multiple
            : DEFAULT_OPERATORS.number.single,
        values: newValues,
      },
    ];
  }

  const newOperator = determineNewOperator(
    "number",
    filter.values,
    newValues,
    isNumberOperator(filter.operator)
      ? filter.operator
      : DEFAULT_OPERATORS.number.single,
  );
  return prev.map((f) =>
    f.columnId === columnId
      ? { columnId, type: "number", operator: newOperator, values: newValues }
      : f,
  );
}

/** Sets a date-typed filter, sorting [from, to] when two dates are given. */
function setDateFilterValue(
  prev: FiltersState,
  columnId: string,
  rawValues: readonly Date[],
): FiltersState {
  const newValues = createDateFilterValue(toDateInput(rawValues));
  if (newValues.length === 0) return prev;

  const filter = prev.find((f) => f.columnId === columnId);
  const isColumnFiltered = filter && filter.values.length > 0;
  if (!isColumnFiltered) {
    return [
      ...prev,
      {
        columnId,
        type: "date",
        operator:
          rawValues.length > 1
            ? DEFAULT_OPERATORS.date.multiple
            : DEFAULT_OPERATORS.date.single,
        values: newValues,
      },
    ];
  }

  const newOperator = determineNewOperator(
    "date",
    filter.values,
    newValues,
    isDateOperator(filter.operator)
      ? filter.operator
      : DEFAULT_OPERATORS.date.single,
  );
  return prev.map((f) =>
    f.columnId === columnId
      ? { columnId, type: "date", operator: newOperator, values: newValues }
      : f,
  );
}

/** Sets a text/option/multiOption filter, deduplicating string values. */
function setOptionLikeFilterValue(
  prev: FiltersState,
  columnId: string,
  type: "text" | "option" | "multiOption",
  rawValues: readonly string[],
): FiltersState {
  const newValues = uniq(rawValues);
  if (newValues.length === 0) return prev;

  const filter = prev.find((f) => f.columnId === columnId);
  const isColumnFiltered = filter && filter.values.length > 0;
  if (!isColumnFiltered) {
    return [
      ...prev,
      {
        columnId,
        type,
        operator:
          rawValues.length > 1
            ? DEFAULT_OPERATORS[type].multiple
            : DEFAULT_OPERATORS[type].single,
        values: newValues,
      },
    ];
  }

  const newOperator = determineNewOperator(
    type,
    filter.values,
    newValues,
    filter.operator,
  );
  return prev.map((f) =>
    f.columnId === columnId
      ? { columnId, type, operator: newOperator, values: newValues }
      : f,
  );
}

/** Coerces an array of dates to the [Date, Date] | [Date] | [] tuple shape. */
function toDateInput(values: readonly Date[]): [Date, Date] | [Date] | [] {
  if (values.length === 0) return [];
  const first = values[0];
  if (!first) return [];
  if (values.length === 1) return [first];
  const second = values[1];
  return second ? [first, second] : [first];
}

/** Type-guard for the number-column operator union. */
function isNumberOperator(
  operator: FilterModel["operator"],
): operator is FilterModel<"number">["operator"] {
  return (
    operator === "is" ||
    operator === "is not" ||
    operator === "is less than" ||
    operator === "is greater than or equal to" ||
    operator === "is greater than" ||
    operator === "is less than or equal to" ||
    operator === "is between" ||
    operator === "is not between"
  );
}

/** Type-guard for the date-column operator union. */
function isDateOperator(
  operator: FilterModel["operator"],
): operator is FilterModel<"date">["operator"] {
  return (
    operator === "is" ||
    operator === "is not" ||
    operator === "is before" ||
    operator === "is on or after" ||
    operator === "is after" ||
    operator === "is on or before" ||
    operator === "is between" ||
    operator === "is not between"
  );
}
