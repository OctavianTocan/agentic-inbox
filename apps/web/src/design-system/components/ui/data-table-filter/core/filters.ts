import { isAnyOf, uniq } from "../lib/array";
import { isColumnOptionArray } from "../lib/helpers";
import { memo } from "../lib/memo";
import type {
  Column,
  ColumnConfig,
  ColumnDataType,
  ColumnOption,
  ElementType,
  FilterStrategy,
  Nullable,
  TAccessorFn,
  TOrderFn,
  TTransformOptionFn,
} from "./types";

/** Immutable fluent builder accumulating a column's config; each setter returns a new builder. */
class ColumnConfigBuilder<
  TData,
  TType extends ColumnDataType = any,
  TVal = unknown,
  TId extends string = string,
> {
  private config: Partial<ColumnConfig<TData, TType, TVal, TId>>;

  constructor(type: TType) {
    this.config = { type } as Partial<ColumnConfig<TData, TType, TVal, TId>>;
  }

  /** Returns a shallow copy carrying the accumulated config so far. */
  private clone(): ColumnConfigBuilder<TData, TType, TVal, TId> {
    const newInstance = new ColumnConfigBuilder<TData, TType, TVal, TId>(
      this.config.type as TType,
    );
    newInstance.config = { ...this.config };
    return newInstance;
  }

  /** Sets the column's unique id, narrowing the builder's id type. */
  id<TNewId extends string>(
    value: TNewId,
  ): ColumnConfigBuilder<TData, TType, TVal, TNewId> {
    const newInstance = this.clone() as any;
    newInstance.config.id = value;
    return newInstance as ColumnConfigBuilder<TData, TType, TVal, TNewId>;
  }

  /** Sets the accessor that reads this column's value from a row. */
  accessor<TNewVal>(
    accessor: TAccessorFn<TData, TNewVal>,
  ): ColumnConfigBuilder<TData, TType, TNewVal, TId> {
    const newInstance = this.clone() as any;
    newInstance.config.accessor = accessor;
    return newInstance as ColumnConfigBuilder<TData, TType, TNewVal, TId>;
  }

  /** Sets the human-readable column name shown in the filter UI. */
  displayName(value: string): ColumnConfigBuilder<TData, TType, TVal, TId> {
    const newInstance = this.clone();
    newInstance.config.displayName = value;
    return newInstance;
  }

  /** Sets the icon component shown alongside the column name. */
  icon(value: any): ColumnConfigBuilder<TData, TType, TVal, TId> {
    const newInstance = this.clone();
    newInstance.config.icon = value;
    return newInstance;
  }

  /** Sets the lower bound for a number column; throws for other column types. */
  min(
    value: number,
  ): ColumnConfigBuilder<
    TData,
    TType extends "number" ? TType : never,
    TVal,
    TId
  > {
    if (this.config.type !== "number") {
      throw new Error("min() is only applicable to number columns");
    }
    const newInstance = this.clone() as any;
    newInstance.config.min = value;
    return newInstance;
  }

  /** Sets the upper bound for a number column; throws for other column types. */
  max(
    value: number,
  ): ColumnConfigBuilder<
    TData,
    TType extends "number" ? TType : never,
    TVal,
    TId
  > {
    if (this.config.type !== "number") {
      throw new Error("max() is only applicable to number columns");
    }
    const newInstance = this.clone() as any;
    newInstance.config.max = value;
    return newInstance;
  }

  /** Sets the static options for an option/multiOption column; throws for other types. */
  options(
    value: ColumnOption[],
  ): ColumnConfigBuilder<
    TData,
    TType extends "option" | "multiOption" ? TType : never,
    TVal,
    TId
  > {
    if (!isAnyOf(this.config.type, ["option", "multiOption"])) {
      throw new Error(
        "options() is only applicable to option or multiOption columns",
      );
    }
    const newInstance = this.clone() as any;
    newInstance.config.options = value;
    return newInstance;
  }

  /** Sets the function mapping raw values to options for an option/multiOption column; throws for other types. */
  transformOptionFn(
    fn: TTransformOptionFn<TVal>,
  ): ColumnConfigBuilder<
    TData,
    TType extends "option" | "multiOption" ? TType : never,
    TVal,
    TId
  > {
    if (!isAnyOf(this.config.type, ["option", "multiOption"])) {
      throw new Error(
        "transformOptionFn() is only applicable to option or multiOption columns",
      );
    }
    const newInstance = this.clone() as any;
    newInstance.config.transformOptionFn = fn;
    return newInstance;
  }

  /** Sets the comparator ordering options for an option/multiOption column; throws for other types. */
  orderFn(
    fn: TOrderFn<TVal>,
  ): ColumnConfigBuilder<
    TData,
    TType extends "option" | "multiOption" ? TType : never,
    TVal,
    TId
  > {
    if (!isAnyOf(this.config.type, ["option", "multiOption"])) {
      throw new Error(
        "orderFn() is only applicable to option or multiOption columns",
      );
    }
    const newInstance = this.clone() as any;
    newInstance.config.orderFn = fn;
    return newInstance;
  }

  /** Finalizes the builder into a ColumnConfig; throws if any required field is unset. */
  build(): ColumnConfig<TData, TType, TVal, TId> {
    if (!this.config.id) throw new Error("id is required");
    if (!this.config.accessor) throw new Error("accessor is required");
    if (!this.config.displayName) throw new Error("displayName is required");
    if (!this.config.icon) throw new Error("icon is required");
    return this.config as ColumnConfig<TData, TType, TVal, TId>;
  }
}

interface FluentColumnConfigHelper<TData> {
  text: () => ColumnConfigBuilder<TData, "text", string>;
  number: () => ColumnConfigBuilder<TData, "number", number>;
  date: () => ColumnConfigBuilder<TData, "date", Date>;
  option: () => ColumnConfigBuilder<TData, "option", string>;
  multiOption: () => ColumnConfigBuilder<TData, "multiOption", string[]>;
}

/**
 * Creates the typed entry point for building column configs over a row type.
 *
 * @template TData - The row type the columns operate over.
 * @returns A helper whose `text`/`number`/`date`/`option`/`multiOption` methods each start a typed builder.
 */
export function createColumnConfigHelper<
  TData,
>(): FluentColumnConfigHelper<TData> {
  return {
    text: () => new ColumnConfigBuilder<TData, "text", string>("text"),
    number: () => new ColumnConfigBuilder<TData, "number", number>("number"),
    date: () => new ColumnConfigBuilder<TData, "date", Date>("date"),
    option: () => new ColumnConfigBuilder<TData, "option", string>("option"),
    multiOption: () =>
      new ColumnConfigBuilder<TData, "multiOption", string[]>("multiOption"),
  };
}

/**
 * Resolves the selectable options for an option/multiOption column.
 *
 * @template TData - The row type the column operates over.
 * @template TType - The column's data type.
 * @template TVal - The column's value type.
 * @param column - The column config to resolve options for.
 * @param data - The row data to derive options from when none are statically configured.
 * @param strategy - `'client'` to derive from data, `'server'` to require pre-supplied options.
 * @returns The column's options, or an empty array for non-option columns.
 * @throws Error when server strategy lacks options, or client data cannot be coerced to options.
 */
export function getColumnOptions<TData, TType extends ColumnDataType, TVal>(
  column: ColumnConfig<TData, TType, TVal>,
  data: TData[],
  strategy: FilterStrategy,
): ColumnOption[] {
  if (!isAnyOf(column.type, ["option", "multiOption"])) {
    console.warn(
      "Column options can only be retrieved for option and multiOption columns",
    );
    return [];
  }

  if (strategy === "server" && !column.options) {
    throw new Error("column options are required for server-side filtering");
  }

  if (column.options) {
    return column.options;
  }

  const filtered = data
    .flatMap(column.accessor)
    .filter((v): v is NonNullable<TVal> => v !== undefined && v !== null);

  let models = uniq(filtered);

  if (column.orderFn) {
    const orderFn = column.orderFn;
    models = models.sort((m1, m2) =>
      orderFn(
        m1 as ElementType<NonNullable<TVal>>,
        m2 as ElementType<NonNullable<TVal>>,
      ),
    );
  }

  if (column.transformOptionFn) {
    const transformOptionFn = column.transformOptionFn;
    const memoizedTransform = memo(
      () => [models],
      (deps) =>
        (deps[0] ?? []).map((m) =>
          transformOptionFn(m as ElementType<NonNullable<TVal>>),
        ),
      { key: `transform-${column.id}` },
    );
    return memoizedTransform();
  }

  if (isColumnOptionArray(models)) return models;

  throw new Error(
    `[data-table-filter] [${column.id}] Either provide static options, a transformOptionFn, or ensure the column data conforms to ColumnOption type`,
  );
}

/**
 * Resolves the flattened, non-null values a column reads across all rows.
 *
 * @template TData - The row type the column operates over.
 * @template TType - The column's data type.
 * @template TVal - The column's value type.
 * @param column - The column config whose accessor extracts values.
 * @param data - The row data to read values from.
 * @returns The column's values; for option columns, mapped through static options or `transformOptionFn`.
 * @throws Error when an option column's values cannot be coerced to options.
 */
export function getColumnValues<TData, TType extends ColumnDataType, TVal>(
  column: ColumnConfig<TData, TType, TVal>,
  data: TData[],
) {
  const memoizedAccessor = memo(
    () => [data],
    (deps) =>
      (deps[0] ?? [])
        .flatMap(column.accessor)
        .filter(
          (v): v is NonNullable<TVal> => v !== undefined && v !== null,
        ) as ElementType<NonNullable<TVal>>[],
    { key: `accessor-${column.id}` },
  );

  const raw = memoizedAccessor();

  if (!isAnyOf(column.type, ["option", "multiOption"])) {
    return raw;
  }

  if (column.options) {
    return raw
      .map((v) => column.options?.find((o) => o.value === v)?.value)
      .filter((v) => v !== undefined && v !== null);
  }

  if (column.transformOptionFn) {
    const memoizedTransform = memo(
      () => [raw],
      (deps) =>
        (deps[0] ?? []).map(
          (v) =>
            column.transformOptionFn?.(v) as ElementType<NonNullable<TVal>>,
        ),
      { key: `transform-values-${column.id}` },
    );
    return memoizedTransform();
  }

  if (isColumnOptionArray(raw)) {
    return raw;
  }

  throw new Error(
    `[data-table-filter] [${column.id}] Either provide static options, a transformOptionFn, or ensure the column data conforms to ColumnOption type`,
  );
}

/**
 * Counts occurrences of each value for an option/multiOption column.
 *
 * @template TData - The row type the column operates over.
 * @template TType - The column's data type.
 * @template TVal - The column's value type.
 * @param column - The column config to facet.
 * @param values - The values to tally (option objects or raw strings).
 * @param strategy - `'server'` returns pre-supplied faceted options; `'client'` tallies the given values.
 * @returns A map of value to occurrence count, or an empty map for non-option columns.
 */
export function getFacetedUniqueValues<
  TData,
  TType extends ColumnDataType,
  TVal,
>(
  column: ColumnConfig<TData, TType, TVal>,
  values: string[] | ColumnOption[],
  strategy: FilterStrategy,
): Map<string, number> | undefined {
  if (!isAnyOf(column.type, ["option", "multiOption"])) {
    console.warn(
      "Faceted unique values can only be retrieved for option and multiOption columns",
    );
    return new Map<string, number>();
  }

  if (strategy === "server") {
    return column.facetedOptions;
  }

  const acc = new Map<string, number>();

  if (isColumnOptionArray(values)) {
    for (const option of values) {
      const curr = acc.get(option.value) ?? 0;
      acc.set(option.value, curr + 1);
    }
  } else {
    for (const option of values) {
      const curr = acc.get(option as string) ?? 0;
      acc.set(option as string, curr + 1);
    }
  }

  return acc;
}

/**
 * Resolves the [min, max] bounds for a number column.
 *
 * @template TData - The row type the column operates over.
 * @template TType - The column's data type.
 * @template TVal - The column's value type.
 * @param column - The column config to bound.
 * @param data - The row data to scan when bounds are not statically configured.
 * @param strategy - `'server'` returns undefined (bounds supplied elsewhere); `'client'` scans the data.
 * @returns The [min, max] tuple, or undefined for non-number or server-strategy columns.
 */
export function getFacetedMinMaxValues<
  TData,
  TType extends ColumnDataType,
  TVal,
>(
  column: ColumnConfig<TData, TType, TVal>,
  data: TData[],
  strategy: FilterStrategy,
): [number, number] | undefined {
  if (column.type !== "number") return undefined;

  if (typeof column.min === "number" && typeof column.max === "number") {
    return [column.min, column.max];
  }

  if (strategy === "server") {
    return undefined;
  }

  const values = data
    .flatMap((row) => column.accessor(row) as Nullable<number>)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  if (values.length === 0) {
    return [0, 0];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  return [min, max];
}

/**
 * Builds runtime `Column` instances from configs, each exposing option/value/facet
 * accessors and (for client strategy) prefetch methods.
 *
 * @template TData - The row type the columns operate over.
 * @param data - The row data the accessors read from.
 * @param columnConfigs - The column configs to materialize.
 * @param strategy - `'client'` derives data and enables prefetch; `'server'` defers to supplied data.
 * @returns The runtime columns with resolved accessors.
 */
export function createColumns<TData>(
  data: TData[],
  columnConfigs: ReadonlyArray<ColumnConfig<TData, any, any, any>>,
  strategy: FilterStrategy,
): Column<TData>[] {
  return columnConfigs.map((columnConfig) => {
    const getOptions: () => ColumnOption[] = memo(
      () => [data, strategy, columnConfig.options],
      ([data, strategy]) =>
        getColumnOptions(columnConfig, data as any, strategy as any),
      { key: `options-${columnConfig.id}` },
    );

    const getValues: () => ElementType<NonNullable<any>>[] = memo(
      () => [data, strategy],
      () => (strategy === "client" ? getColumnValues(columnConfig, data) : []),
      { key: `values-${columnConfig.id}` },
    );

    const getUniqueValues: () => Map<string, number> | undefined = memo(
      () => [getValues(), strategy],
      ([values, strategy]) =>
        getFacetedUniqueValues(columnConfig, values as any, strategy as any),
      { key: `faceted-${columnConfig.id}` },
    );

    const getMinMaxValues: () => [number, number] | undefined = memo(
      () => [data, strategy],
      () => getFacetedMinMaxValues(columnConfig, data, strategy),
      { key: `minmax-${columnConfig.id}` },
    );

    const column: Column<TData> = {
      ...columnConfig,
      getOptions,
      getValues,
      getFacetedUniqueValues: getUniqueValues,
      getFacetedMinMaxValues: getMinMaxValues,
      prefetchOptions: async () => {},
      prefetchValues: async () => {},
      prefetchFacetedUniqueValues: async () => {},
      prefetchFacetedMinMaxValues: async () => {},
      _prefetchedOptionsCache: null,
      _prefetchedValuesCache: null,
      _prefetchedFacetedUniqueValuesCache: null,
      _prefetchedFacetedMinMaxValuesCache: null,
    };

    if (strategy === "client") {
      column.prefetchOptions = async (): Promise<void> => {
        if (!column._prefetchedOptionsCache) {
          await new Promise((resolve) =>
            setTimeout(() => {
              const options = getOptions();
              column._prefetchedOptionsCache = options;
              resolve(undefined);
            }, 0),
          );
        }
      };

      column.prefetchValues = async (): Promise<void> => {
        if (!column._prefetchedValuesCache) {
          await new Promise((resolve) =>
            setTimeout(() => {
              const values = getValues();
              column._prefetchedValuesCache = values;
              resolve(undefined);
            }, 0),
          );
        }
      };

      column.prefetchFacetedUniqueValues = async (): Promise<void> => {
        if (!column._prefetchedFacetedUniqueValuesCache) {
          await new Promise((resolve) =>
            setTimeout(() => {
              const facetedMap = getUniqueValues();
              column._prefetchedFacetedUniqueValuesCache = facetedMap ?? null;
              resolve(undefined);
            }, 0),
          );
        }
      };

      column.prefetchFacetedMinMaxValues = async (): Promise<void> => {
        if (!column._prefetchedFacetedMinMaxValuesCache) {
          await new Promise((resolve) =>
            setTimeout(() => {
              const value = getMinMaxValues();
              column._prefetchedFacetedMinMaxValuesCache = value ?? null;
              resolve(undefined);
            }, 0),
          );
        }
      };
    }

    return column;
  });
}
