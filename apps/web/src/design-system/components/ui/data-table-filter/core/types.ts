import type { Icon } from "@/design-system/components/icons";

export type ElementType<T> = T extends (infer U)[] ? U : T;

export type Nullable<T> = T | null | undefined;

export type ColumnOption = {
  label: string;
  value: string;
  icon?: React.ReactElement | React.ElementType;
};

export type ColumnOptionExtended = ColumnOption & {
  selected?: boolean;
  count?: number;
};

export type ColumnDataType =
  | "text"
  | "number"
  | "date"
  | "option"
  | "multiOption";

export type OptionBasedColumnDataType = Extract<
  ColumnDataType,
  "option" | "multiOption"
>;

export type ColumnDataNativeMap = {
  text: string;
  number: number;
  date: Date;
  option: string;
  multiOption: string[];
};

export type FilterValues<T extends ColumnDataType> = Array<
  ElementType<ColumnDataNativeMap[T]>
>;

export type TAccessorFn<TData, TVal = unknown> = (data: TData) => TVal;

export type TTransformOptionFn<TVal = unknown> = (
  value: ElementType<NonNullable<TVal>>,
) => ColumnOption;

export type TOrderFn<TVal = unknown> = (
  a: ElementType<NonNullable<TVal>>,
  b: ElementType<NonNullable<TVal>>,
) => number;

export type ColumnConfig<
  TData,
  TType extends ColumnDataType = ColumnDataType,
  TVal = unknown,
  TId extends string = string,
> = {
  id: TId;
  accessor: TAccessorFn<TData, TVal>;
  displayName: string;
  icon: Icon;
  type: TType;
  options?: TType extends OptionBasedColumnDataType ? ColumnOption[] : never;
  facetedOptions?: TType extends OptionBasedColumnDataType
    ? Map<string, number>
    : never;
  min?: TType extends "number" ? number : never;
  max?: TType extends "number" ? number : never;
  transformOptionFn?: TType extends OptionBasedColumnDataType
    ? TTransformOptionFn<TVal>
    : never;
  orderFn?: TType extends OptionBasedColumnDataType ? TOrderFn<TVal> : never;
};

export type OptionColumnId<T> =
  T extends ColumnConfig<
    infer _TData,
    "option" | "multiOption",
    infer _TVal,
    infer TId
  >
    ? TId
    : never;

export type OptionColumnIds<
  T extends ReadonlyArray<ColumnConfig<any, any, any, any>>,
> = {
  [K in keyof T]: OptionColumnId<T[K]>;
}[number];

export type NumberColumnId<T> =
  T extends ColumnConfig<infer _TData, "number", infer _TVal, infer TId>
    ? TId
    : never;

export type NumberColumnIds<
  T extends ReadonlyArray<ColumnConfig<any, any, any, any>>,
> = {
  [K in keyof T]: NumberColumnId<T[K]>;
}[number];

export type ColumnConfigHelper<TData> = {
  accessor: <
    TAccessor extends TAccessorFn<TData>,
    TType extends ColumnDataType,
    TVal extends ReturnType<TAccessor>,
  >(
    accessor: TAccessor,
    config?: Omit<ColumnConfig<TData, TType, TVal>, "accessor">,
  ) => ColumnConfig<TData, TType, unknown>;
};

export type DataTableFilterConfig<TData> = {
  data: TData[];
  columns: ColumnConfig<TData>[];
};

export type ColumnProperties<_TData, TVal> = {
  getOptions: () => ColumnOption[];
  getValues: () => ElementType<NonNullable<TVal>>[];
  getFacetedUniqueValues: () => Map<string, number> | undefined;
  getFacetedMinMaxValues: () => [number, number] | undefined;
  prefetchOptions: () => Promise<void>;
  prefetchValues: () => Promise<void>;
  prefetchFacetedUniqueValues: () => Promise<void>;
  prefetchFacetedMinMaxValues: () => Promise<void>;
};

export type ColumnPrivateProperties<_TData, TVal> = {
  _prefetchedOptionsCache: ColumnOption[] | null;
  _prefetchedValuesCache: ElementType<NonNullable<TVal>>[] | null;
  _prefetchedFacetedUniqueValuesCache: Map<string, number> | null;
  _prefetchedFacetedMinMaxValuesCache: [number, number] | null;
};

export type Column<
  TData,
  TType extends ColumnDataType = ColumnDataType,
  TVal = unknown,
> = ColumnConfig<TData, TType, TVal> &
  ColumnProperties<TData, TVal> &
  ColumnPrivateProperties<TData, TVal>;

export type DataTableFilterActions = {
  addFilterValue: <TData, TType extends OptionBasedColumnDataType>(
    column: Column<TData, TType>,
    values: FilterModel<TType>["values"],
  ) => void;

  removeFilterValue: <TData, TType extends OptionBasedColumnDataType>(
    column: Column<TData, TType>,
    value: FilterModel<TType>["values"],
  ) => void;

  setFilterValue: <TData, TType extends ColumnDataType>(
    column: Column<TData, TType>,
    values: FilterModel<TType>["values"],
  ) => void;

  setFilterOperator: <TType extends ColumnDataType>(
    columnId: string,
    operator: FilterModel<TType>["operator"],
  ) => void;

  removeFilter: (columnId: string) => void;

  removeAllFilters: () => void;
};

export type FilterStrategy = "client" | "server";

export type TextFilterOperator = "contains" | "does not contain";

export type NumberFilterOperator =
  | "is"
  | "is not"
  | "is less than"
  | "is greater than or equal to"
  | "is greater than"
  | "is less than or equal to"
  | "is between"
  | "is not between";

export type DateFilterOperator =
  | "is"
  | "is not"
  | "is before"
  | "is on or after"
  | "is after"
  | "is on or before"
  | "is between"
  | "is not between";

export type OptionFilterOperator = "is" | "is not" | "is any of" | "is none of";

export type MultiOptionFilterOperator =
  | "include"
  | "exclude"
  | "include any of"
  | "include all of"
  | "exclude if any of"
  | "exclude if all";

export type FilterOperators = {
  text: TextFilterOperator;
  number: NumberFilterOperator;
  date: DateFilterOperator;
  option: OptionFilterOperator;
  multiOption: MultiOptionFilterOperator;
};

export type FilterModel<TType extends ColumnDataType = ColumnDataType> = {
  columnId: string;
  type: TType;
  operator: FilterOperators[TType];
  values: FilterValues<TType>;
};

export type FiltersState = Array<FilterModel>;

export type FilterDetails<T extends ColumnDataType> = {
  [key in FilterOperators[T]]: FilterOperatorDetails<key, T>;
};

export type FilterOperatorTarget = "single" | "multiple";

export type FilterOperatorDetailsBase<
  OperatorValue,
  T extends ColumnDataType,
> = {
  key: string;
  value: OperatorValue;
  target: FilterOperatorTarget;
  singularOf?: FilterOperators[T];
  pluralOf?: FilterOperators[T];
  relativeOf: FilterOperators[T] | Array<FilterOperators[T]>;
  isNegated: boolean;
  negation?: FilterOperators[T];
  negationOf?: FilterOperators[T];
};

export type FilterOperatorDetails<
  OperatorValue,
  T extends ColumnDataType,
> = FilterOperatorDetailsBase<OperatorValue, T> &
  (
    | { singularOf?: never; pluralOf?: never }
    | { target: "single"; singularOf: FilterOperators[T]; pluralOf?: never }
    | { target: "multiple"; singularOf?: never; pluralOf: FilterOperators[T] }
  ) &
  (
    | { isNegated: false; negation: FilterOperators[T]; negationOf?: never }
    | { isNegated: true; negation?: never; negationOf: FilterOperators[T] }
  );

export type FilterTypeOperatorDetails = {
  [key in ColumnDataType]: FilterDetails<key>;
};
