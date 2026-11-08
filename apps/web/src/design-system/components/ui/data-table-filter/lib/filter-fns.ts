import {
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { dateFilterOperators } from "../core/operators";
import type { FilterModel } from "../core/types";
import { intersection } from "./array";

/**
 * Applies an `option`-typed filter to a single string row value.
 *
 * @param inputData - The row's option value (case-insensitive).
 * @param filterValue - The active filter for this column.
 * @returns Whether the row passes the filter.
 */
export function optionFilterFn(
  inputData: string,
  filterValue: FilterModel<"option">,
): boolean {
  if (!inputData) return false;
  if (filterValue.values.length === 0) return true;

  const value = inputData.toString().toLowerCase();

  const found = !!filterValue.values.find((v) => v.toLowerCase() === value);

  switch (filterValue.operator) {
    case "is":
    case "is any of":
      return found;
    case "is not":
    case "is none of":
      return !found;
  }
}

/**
 * Applies a `multiOption`-typed filter to a row's array of strings.
 *
 * @param inputData - The row's multi-option value.
 * @param filterValue - The active filter for this column.
 * @returns Whether the row passes the filter.
 */
export function multiOptionFilterFn(
  inputData: readonly string[],
  filterValue: FilterModel<"multiOption">,
): boolean {
  if (!inputData) return false;

  if (
    filterValue.values.length === 0 ||
    !filterValue.values[0] ||
    filterValue.values[0].length === 0
  )
    return true;

  const filterValues = filterValue.values;

  switch (filterValue.operator) {
    case "include":
    case "include any of":
      return intersection(inputData, filterValues).length > 0;
    case "exclude":
      return intersection(inputData, filterValues).length === 0;
    case "exclude if any of":
      return !(intersection(inputData, filterValues).length > 0);
    case "include all of":
      return (
        intersection(inputData, filterValues).length === filterValues.length
      );
    case "exclude if all":
      return !(
        intersection(inputData, filterValues).length === filterValues.length
      );
  }
}

/**
 * Applies a `date`-typed filter to a single date row value.
 *
 * @param inputData - The row's date value.
 * @param filterValue - The active filter for this column.
 * @returns Whether the row passes the filter.
 */
export function dateFilterFn(
  inputData: Date,
  filterValue: FilterModel<"date">,
): boolean {
  if (!filterValue || filterValue.values.length === 0) return true;

  if (
    dateFilterOperators[filterValue.operator].target === "single" &&
    filterValue.values.length > 1
  )
    throw new Error("Singular operators require at most one filter value");

  if (
    ["is between", "is not between"].includes(filterValue.operator) &&
    filterValue.values.length !== 2
  )
    throw new Error("Plural operators require two filter values");

  const filterVals = filterValue.values;
  const d1 = filterVals[0];
  const d2 = filterVals[1];
  if (!d1) {
    return true;
  }

  switch (filterValue.operator) {
    case "is":
      return isSameDay(inputData, d1);
    case "is not":
      return !isSameDay(inputData, d1);
    case "is before":
      return isBefore(inputData, startOfDay(d1));
    case "is on or after":
      return isSameDay(inputData, d1) || isAfter(inputData, startOfDay(d1));
    case "is after":
      return isAfter(inputData, startOfDay(d1));
    case "is on or before":
      return isSameDay(inputData, d1) || isBefore(inputData, startOfDay(d1));
    case "is between":
      if (!d2) {
        return true;
      }
      return isWithinInterval(inputData, {
        start: startOfDay(d1),
        end: endOfDay(d2),
      });
    case "is not between":
      if (!d2) {
        return true;
      }
      return !isWithinInterval(inputData, {
        start: startOfDay(d1),
        end: endOfDay(d2),
      });
  }
}

/**
 * Applies a `text`-typed filter to a single string row value.
 *
 * @param inputData - The row's text value.
 * @param filterValue - The active filter for this column.
 * @returns Whether the row passes the filter.
 */
export function textFilterFn(
  inputData: string,
  filterValue: FilterModel<"text">,
): boolean {
  if (!filterValue || filterValue.values.length === 0) return true;

  const value = inputData.toLowerCase().trim();
  const firstValue = filterValue.values[0];
  if (firstValue === undefined) return true;

  const filterStr = firstValue.toLowerCase().trim();

  if (filterStr === "") return true;

  const found = value.includes(filterStr);

  switch (filterValue.operator) {
    case "contains":
      return found;
    case "does not contain":
      return !found;
  }
}

/**
 * Applies a `number`-typed filter to a single numeric row value.
 *
 * @param inputData - The row's numeric value.
 * @param filterValue - The active filter for this column.
 * @returns Whether the row passes the filter.
 */
export function numberFilterFn(
  inputData: number,
  filterValue: FilterModel<"number">,
): boolean {
  if (!filterValue?.values || filterValue.values.length === 0) {
    return true;
  }

  const filterVal = filterValue.values[0];
  if (filterVal === undefined) {
    return true;
  }

  switch (filterValue.operator) {
    case "is":
      return inputData === filterVal;
    case "is not":
      return inputData !== filterVal;
    case "is greater than":
      return inputData > filterVal;
    case "is greater than or equal to":
      return inputData >= filterVal;
    case "is less than":
      return inputData < filterVal;
    case "is less than or equal to":
      return inputData <= filterVal;
    case "is between": {
      const lowerBound = filterValue.values[0];
      const upperBound = filterValue.values[1];
      if (lowerBound === undefined || upperBound === undefined) {
        return true;
      }
      return inputData >= lowerBound && inputData <= upperBound;
    }
    case "is not between": {
      const lowerBound = filterValue.values[0];
      const upperBound = filterValue.values[1];
      if (lowerBound === undefined || upperBound === undefined) {
        return true;
      }
      return inputData < lowerBound || inputData > upperBound;
    }
    default:
      return true;
  }
}
