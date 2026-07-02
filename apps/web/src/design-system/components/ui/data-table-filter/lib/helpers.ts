import { isBefore } from "date-fns";
import type { Column, ColumnOption } from "../core/types";

/**
 * Looks up a column by id.
 *
 * @template TData - The table row type.
 * @param columns - The available columns.
 * @param id - The column id to find.
 * @returns The matching column.
 * @throws When no column has the given id.
 */
export function getColumn<TData>(columns: Column<TData>[], id: string) {
  const column = columns.find((c) => c.id === id);

  if (!column) {
    throw new Error(`Column with id ${id} not found`);
  }

  return column;
}

/**
 * Normalizes raw numeric input into a valid number filter value.
 *
 * @param values - Zero, one, or two candidate numbers.
 * @returns An empty array, a single value, or an ordered min/max pair.
 */
export function createNumberFilterValue(
  values: number[] | undefined,
): number[] {
  if (!values || values.length === 0) return [];
  const first = values[0];
  if (first === undefined) return [];
  if (values.length === 1) return [first];
  if (values.length === 2) return createNumberRange(values);
  const second = values[1];
  return second === undefined ? [first] : [first, second];
}

/**
 * Normalizes raw date input into a valid date filter value.
 *
 * @param values - Zero, one, or two candidate dates.
 * @returns An empty array, a single date, or an ordered date range.
 * @throws When more than two values are supplied.
 */
export function createDateFilterValue(
  values: [Date, Date] | [Date] | [] | undefined,
) {
  if (!values || values.length === 0) return [];
  if (values.length === 1) return [values[0]];
  if (values.length === 2) return createDateRange(values);
  throw new Error("Cannot create date filter value from more than 2 values");
}

/**
 * Orders two dates into an ascending range.
 *
 * @param values - The two dates to order.
 * @returns A `[min, max]` date pair.
 */
export function createDateRange(values: [Date, Date]) {
  const [a, b] = values;
  const [min, max] = isBefore(a, b) ? [a, b] : [b, a];

  return [min, max];
}

/**
 * Orders up to two numbers into an ascending range, defaulting missing values to zero.
 *
 * @param values - Zero, one, or two candidate numbers.
 * @returns A `[min, max]` number pair.
 */
export function createNumberRange(values: number[] | undefined) {
  let a = 0;
  let b = 0;

  if (!values || values.length === 0) return [a, b];
  const first = values[0];
  if (first === undefined) return [a, b];
  if (values.length === 1) {
    a = first;
  } else {
    a = first;
    b = values[1] ?? 0;
  }

  const [min, max] = a < b ? [a, b] : [b, a];

  return [min, max];
}

/** Narrows a value to a `ColumnOption` (an object with `value` and `label`). */
export function isColumnOption(value: unknown): value is ColumnOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "label" in value
  );
}

/** Narrows a value to an array of `ColumnOption`. */
export function isColumnOptionArray(value: unknown): value is ColumnOption[] {
  return Array.isArray(value) && value.every(isColumnOption);
}

/** Narrows a value to an array of strings. */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Narrows a value to a `Map` from string keys to number values. */
export function isColumnOptionMap(
  value: unknown,
): value is Map<string, number> {
  if (!(value instanceof Map)) {
    return false;
  }
  for (const key of value.keys()) {
    if (typeof key !== "string") {
      return false;
    }
  }
  for (const val of value.values()) {
    if (typeof val !== "number") {
      return false;
    }
  }
  return true;
}

/** Narrows a value to a two-element `[number, number]` tuple. */
export function isMinMaxTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}
