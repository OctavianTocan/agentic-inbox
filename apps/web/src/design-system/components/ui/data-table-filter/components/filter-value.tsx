/** Patched for base-ui compatibility (vendored from bazza/ui registry). */

import { format, isEqual } from "date-fns";
import {
  cloneElement,
  isValidElement,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DateRange } from "react-day-picker";
import { MoreHorizontalIcon } from "@/design-system/components/icons";
import { Button } from "@/design-system/components/ui/button";
import { Calendar } from "@/design-system/components/ui/calendar";
import { Checkbox } from "@/design-system/components/ui/checkbox";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/design-system/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/components/ui/popover";
import { Slider } from "@/design-system/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system/components/ui/tabs";
import { cn } from "@/design-system/lib/utils";
import { numberFilterOperators } from "../core/operators";
import type {
  Column,
  ColumnDataType,
  ColumnOptionExtended,
  DataTableFilterActions,
  FilterModel,
  FilterStrategy,
} from "../core/types";
import { useDebounceCallback } from "../hooks/use-debounce-callback";
import { take } from "../lib/array";
import { createNumberRange } from "../lib/helpers";
import { type Locale, t } from "../lib/i18n";
import { DebouncedInput } from "../ui/debounced-input";

interface FilterValueProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export const FilterValue = memo(__FilterValue) as typeof __FilterValue;

/** Popover trigger showing a filter's current value, opening its value editor. */
function __FilterValue<TData, TType extends ColumnDataType>({
  filter,
  column,
  actions,
  strategy,
  locale = "en",
}: FilterValueProps<TData, TType>) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="m-0 h-full w-fit shrink-0 whitespace-nowrap rounded-none p-0 px-2.5 text-xs"
          />
        }
      >
        <FilterValueDisplay
          filter={filter}
          column={column}
          actions={actions}
          locale={locale}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-fit p-0 origin-(--radix-popover-content-transform-origin)"
      >
        <FilterValueController
          filter={filter}
          column={column}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}

interface FilterValueDisplayProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  locale?: Locale;
}

/** Narrows a generic column by its runtime data type. */
function isColumnType<TData, TType extends ColumnDataType>(
  column: Column<TData>,
  type: TType,
): column is Column<TData, TType> {
  return column.type === type;
}

/** Narrows a generic filter by its runtime data type. */
function isFilterType<TType extends ColumnDataType>(
  filter: FilterModel | undefined,
  type: TType,
): filter is FilterModel<TType> {
  return filter?.type === type;
}

/** Renders the value summary for a filter, dispatched on the column's data type. */
export function FilterValueDisplay<TData, TType extends ColumnDataType>({
  filter,
  column,
  actions,
  locale = "en",
}: FilterValueDisplayProps<TData, TType>) {
  switch (column.type) {
    case "option": {
      if (!isColumnType(column, "option") || !isFilterType(filter, "option")) {
        return null;
      }
      return (
        <FilterValueOptionDisplay<TData>
          filter={filter}
          column={column}
          actions={actions}
          locale={locale}
        />
      );
    }
    case "multiOption": {
      if (
        !isColumnType(column, "multiOption") ||
        !isFilterType(filter, "multiOption")
      ) {
        return null;
      }
      return (
        <FilterValueMultiOptionDisplay<TData>
          filter={filter}
          column={column}
          actions={actions}
          locale={locale}
        />
      );
    }
    case "date": {
      if (!isColumnType(column, "date") || !isFilterType(filter, "date")) {
        return null;
      }
      return (
        <FilterValueDateDisplay<TData>
          filter={filter}
          column={column}
          actions={actions}
          locale={locale}
        />
      );
    }
    case "text": {
      if (!isColumnType(column, "text") || !isFilterType(filter, "text")) {
        return null;
      }
      return (
        <FilterValueTextDisplay<TData>
          filter={filter}
          column={column}
          actions={actions}
          locale={locale}
        />
      );
    }
    case "number": {
      if (!isColumnType(column, "number") || !isFilterType(filter, "number")) {
        return null;
      }
      return (
        <FilterValueNumberDisplay<TData>
          filter={filter}
          column={column}
          actions={actions}
          locale={locale}
        />
      );
    }
    default:
      return null;
  }
}

/** Summarizes an option filter: a single option's icon and label, else a count with up to three icons. */
export function FilterValueOptionDisplay<TData>({
  filter,
  column,
  actions: _actions,
  locale: _locale = "en",
}: FilterValueDisplayProps<TData, "option">) {
  const options = useMemo(() => column.getOptions(), [column]);
  const selected = options.filter((o) => filter?.values.includes(o.value));

  const onlySelected = selected.length === 1 ? selected[0] : undefined;
  if (onlySelected) {
    const { label, icon: Icon } = onlySelected;
    const hasIcon = !!Icon;
    return (
      <span className="inline-flex items-center gap-1">
        {hasIcon &&
          (isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon className="size-4 text-primary" />
          ))}
        <span>{label}</span>
      </span>
    );
  }
  const name = column.displayName.toLowerCase();
  // TODO: Better pluralization for different languages
  const pluralName = name.endsWith("s") ? `${name}es` : `${name}s`;

  const hasOptionIcons = !options?.some((o) => !o.icon);

  return (
    <div className="inline-flex items-center gap-0.5">
      {hasOptionIcons &&
        take(selected, 3).map(({ value, icon }) => {
          const Icon = icon!;
          return isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon key={value} className="size-4" />
          );
        })}
      <span className={cn(hasOptionIcons && "ml-1.5")}>
        {selected.length} {pluralName}
      </span>
    </div>
  );
}

/** Summarizes a multi-option filter: a single option's icon and label, else a count with up to three icons. */
export function FilterValueMultiOptionDisplay<TData>({
  filter,
  column,
  actions: _actions,
  locale: _locale = "en",
}: FilterValueDisplayProps<TData, "multiOption">) {
  const options = useMemo(() => column.getOptions(), [column]);
  const selected = options.filter((o) => filter.values.includes(o.value));

  const onlySelected = selected.length === 1 ? selected[0] : undefined;
  if (onlySelected) {
    const { label, icon: Icon } = onlySelected;
    const hasIcon = !!Icon;
    return (
      <span className="inline-flex items-center gap-1.5">
        {hasIcon &&
          (isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon className="size-4 text-primary" />
          ))}

        <span>{label}</span>
      </span>
    );
  }

  const name = column.displayName.toLowerCase();

  const hasOptionIcons = !options?.some((o) => !o.icon);

  return (
    <div className="inline-flex items-center gap-1.5">
      {hasOptionIcons && (
        <div key="icons" className="inline-flex items-center gap-0.5">
          {take(selected, 3).map(({ value, icon }) => {
            const Icon = icon!;
            return isValidElement(Icon) ? (
              cloneElement(Icon, { key: value })
            ) : (
              <Icon key={value} className="size-4" />
            );
          })}
        </div>
      )}
      <span>
        {selected.length} {name}
      </span>
    </div>
  );
}

/** Formats a start/end date pair into a compact range label, collapsing shared month and year. */
function formatDateRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
  }

  if (sameYear) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

/** Displays a date filter value or range summary. */
export function FilterValueDateDisplay<TData>({
  filter,
  column: _column,
  actions: _actions,
  locale: _locale = "en",
}: FilterValueDisplayProps<TData, "date">) {
  if (!filter) return null;
  if (filter.values.length === 0)
    return <MoreHorizontalIcon className="size-4" />;
  if (filter.values.length === 1) {
    const value = filter.values[0];
    if (!value) return <MoreHorizontalIcon className="size-4" />;

    const formattedDateStr = format(value, "MMM d, yyyy");

    return <span>{formattedDateStr}</span>;
  }

  const [start, end] = filter.values;
  if (!start || !end) return <MoreHorizontalIcon className="size-4" />;

  const formattedRangeStr = formatDateRange(start, end);

  return <span>{formattedRangeStr}</span>;
}

/** Displays a text filter value summary. */
export function FilterValueTextDisplay<TData>({
  filter,
  column: _column,
  actions: _actions,
  locale: _locale = "en",
}: FilterValueDisplayProps<TData, "text">) {
  if (!filter) return null;
  const value = filter.values[0];
  if (value === undefined || value.trim() === "")
    return <MoreHorizontalIcon className="size-4" />;

  return <span>{value}</span>;
}

/** Summarizes a number filter as a single value or a "min and max" range. */
export function FilterValueNumberDisplay<TData>({
  filter,
  column: _column,
  actions: _actions,
  locale = "en",
}: FilterValueDisplayProps<TData, "number">) {
  if (!filter?.values || filter.values.length === 0) return null;

  if (
    filter.operator === "is between" ||
    filter.operator === "is not between"
  ) {
    const minValue = filter.values[0];
    const maxValue = filter.values[1];

    return (
      <span className="tabular-nums tracking-tight">
        {minValue} {t("and", locale)} {maxValue}
      </span>
    );
  }

  const value = filter.values[0];
  return <span className="tabular-nums tracking-tight">{value}</span>;
}

interface FilterValueControllerProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType> | undefined;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export const FilterValueController = memo(
  __FilterValueController,
) as typeof __FilterValueController;

/** Renders the value editor for a filter, dispatched on the column's data type. */
function __FilterValueController<TData, TType extends ColumnDataType>({
  filter,
  column,
  actions,
  strategy,
  locale = "en",
}: FilterValueControllerProps<TData, TType>) {
  switch (column.type) {
    case "option": {
      if (!isColumnType(column, "option") || !isFilterType(filter, "option")) {
        return null;
      }
      return (
        <FilterValueOptionController<TData>
          filter={filter}
          column={column}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      );
    }
    case "multiOption": {
      if (
        !isColumnType(column, "multiOption") ||
        !isFilterType(filter, "multiOption")
      ) {
        return null;
      }
      return (
        <FilterValueMultiOptionController<TData>
          filter={filter}
          column={column}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      );
    }
    case "date": {
      if (!isColumnType(column, "date") || !isFilterType(filter, "date")) {
        return null;
      }
      return (
        <FilterValueDateController<TData>
          filter={filter}
          column={column}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      );
    }
    case "text": {
      if (!isColumnType(column, "text") || !isFilterType(filter, "text")) {
        return null;
      }
      return (
        <FilterValueTextController<TData>
          filter={filter}
          column={column}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      );
    }
    case "number": {
      if (!isColumnType(column, "number") || !isFilterType(filter, "number")) {
        return null;
      }
      return (
        <FilterValueNumberController<TData>
          filter={filter}
          column={column}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      );
    }
    default:
      return null;
  }
}

interface OptionItemProps {
  option: ColumnOptionExtended & { initialSelected: boolean };
  onToggle: (value: string, checked: boolean) => void;
}

/** Selectable checkbox row for a single filter option, with icon, label, and count. */
const OptionItem = memo(function OptionItem({
  option,
  onToggle,
}: OptionItemProps) {
  const { value, label, icon: Icon, selected, count } = option;
  const handleSelect = useCallback(() => {
    onToggle(value, !selected);
  }, [onToggle, value, selected]);

  return (
    <CommandItem
      key={value}
      onSelect={handleSelect}
      className="group flex items-center justify-between gap-1.5"
    >
      <div className="flex items-center gap-1.5">
        <Checkbox
          checked={selected}
          className="mr-1 border-foreground/20 bg-transparent dark:border-ring"
        />
        {Icon &&
          (isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon className="size-4 text-primary" />
          ))}
        <span>
          {label}
          <sup
            className={cn(
              count == null && "hidden",
              "ml-0.5 tabular-nums tracking-tight text-muted-foreground",
              count === 0 && "slashed-zero",
            )}
          >
            {typeof count === "number" ? (count < 100 ? count : "100+") : ""}
          </sup>
        </span>
      </div>
    </CommandItem>
  );
});

/** Two-group (selected, unselected) option picker for an option filter. */
export function FilterValueOptionController<TData>({
  filter,
  column,
  actions,
  locale: _locale = "en",
}: FilterValueControllerProps<TData, "option">) {
  // Freeze the initial selection so the selected/unselected split stays put while toggling.
  const initialSelectedValuesRef = useRef<Set<string> | null>(null);
  if (initialSelectedValuesRef.current === null) {
    initialSelectedValuesRef.current = new Set(filter?.values ?? []);
  }
  const initialSelectedValues = initialSelectedValuesRef.current;

  const counts = column.getFacetedUniqueValues();
  const rawOptions = column.getOptions();

  const options = useMemo(
    () =>
      rawOptions.map((o) => ({
        ...o,
        selected: filter?.values.includes(o.value) ?? false,
        initialSelected: initialSelectedValues.has(o.value),
        count: counts?.get(o.value) ?? 0,
      })),
    [rawOptions, counts, filter?.values, initialSelectedValues],
  );

  const handleToggle = useCallback(
    (value: string, checked: boolean) => {
      if (checked) actions.addFilterValue(column, [value]);
      else actions.removeFilterValue(column, [value]);
    },
    [actions, column],
  );

  const { selectedOptions, unselectedOptions } = useMemo(() => {
    const sel: typeof options = [];
    const unsel: typeof options = [];
    for (const o of options) {
      if (o.initialSelected) sel.push(o);
      else unsel.push(o);
    }
    return { selectedOptions: sel, unselectedOptions: unsel };
  }, [options]);

  return (
    <Command loop>
      <CommandList className="max-h-fit">
        <CommandGroup className={cn(selectedOptions.length === 0 && "hidden")}>
          {selectedOptions.map((option) => (
            <OptionItem
              key={option.value}
              option={option}
              onToggle={handleToggle}
            />
          ))}
        </CommandGroup>
        <CommandGroup
          className={cn(unselectedOptions.length === 0 && "hidden")}
        >
          {unselectedOptions.map((option) => (
            <OptionItem
              key={option.value}
              option={option}
              onToggle={handleToggle}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/** Controller for multi-option filter values. */
export function FilterValueMultiOptionController<TData>({
  filter,
  column,
  actions,
  locale: _locale = "en",
}: FilterValueControllerProps<TData, "multiOption">) {
  // Freeze the initial selection so the selected/unselected split stays put while toggling.
  const initialSelectedValuesRef = useRef<Set<string> | null>(null);
  if (initialSelectedValuesRef.current === null) {
    initialSelectedValuesRef.current = new Set(filter?.values ?? []);
  }
  const initialSelectedValues = initialSelectedValuesRef.current;

  const counts = column.getFacetedUniqueValues();
  const rawOptions = column.getOptions();

  const options = useMemo(
    () =>
      rawOptions.map((o) => ({
        ...o,
        selected: filter?.values.includes(o.value) ?? false,
        initialSelected: initialSelectedValues.has(o.value),
        count: counts?.get(o.value) ?? 0,
      })),
    [rawOptions, counts, filter?.values, initialSelectedValues],
  );

  const handleToggle = useCallback(
    (value: string, checked: boolean) => {
      if (checked) actions.addFilterValue(column, [value]);
      else actions.removeFilterValue(column, [value]);
    },
    [actions, column],
  );

  const { selectedOptions, unselectedOptions } = useMemo(() => {
    const sel: typeof options = [];
    const unsel: typeof options = [];
    for (const o of options) {
      if (o.initialSelected) sel.push(o);
      else unsel.push(o);
    }
    return { selectedOptions: sel, unselectedOptions: unsel };
  }, [options]);

  return (
    <Command loop>
      <CommandList>
        <CommandGroup className={cn(selectedOptions.length === 0 && "hidden")}>
          {selectedOptions.map((option) => (
            <OptionItem
              key={option.value}
              option={option}
              onToggle={handleToggle}
            />
          ))}
        </CommandGroup>
        <CommandGroup
          className={cn(unselectedOptions.length === 0 && "hidden")}
        >
          {unselectedOptions.map((option) => (
            <OptionItem
              key={option.value}
              option={option}
              onToggle={handleToggle}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/** Calendar range picker that writes the selected date(s) to the filter. */
export function FilterValueDateController<TData>({
  filter,
  column,
  actions,
}: FilterValueControllerProps<TData, "date">) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: filter?.values[0] ?? new Date(),
    to: filter?.values[1] ?? undefined,
  });

  function changeDateRange(value: DateRange | undefined) {
    const start = value?.from;
    const end =
      start && value?.to && !isEqual(start, value.to) ? value.to : undefined;

    setDate({ from: start, to: end });

    const isRange = start && end;
    const newValues = isRange ? [start, end] : start ? [start] : [];

    actions.setFilterValue(column, newValues);
  }

  return (
    <Command>
      <CommandList className="max-h-fit">
        <CommandGroup>
          <div>
            <Calendar
              mode="range"
              {...(date?.from ? { defaultMonth: date.from } : {})}
              selected={date}
              onSelect={changeDateRange}
              numberOfMonths={1}
            />
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/** Debounced text input that writes the entered string to the filter. */
export function FilterValueTextController<TData>({
  filter,
  column,
  actions,
  locale = "en",
}: FilterValueControllerProps<TData, "text">) {
  const changeText = (value: string | number) => {
    actions.setFilterValue(column, [String(value)]);
  };

  return (
    <Command>
      <CommandList className="max-h-fit">
        <CommandGroup>
          <CommandItem>
            <DebouncedInput
              placeholder={t("search", locale)}
              autoFocus
              value={filter?.values[0] ?? ""}
              onChange={changeText}
            />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/** Slider and inputs for editing a number filter as a single value or a range. */
export function FilterValueNumberController<TData>({
  filter,
  column,
  actions,
  locale = "en",
}: FilterValueControllerProps<TData, "number">) {
  const minMax = useMemo(() => column.getFacetedMinMaxValues(), [column]);
  const [sliderMin, sliderMax] = [
    minMax ? minMax[0] : 0,
    minMax ? minMax[1] : 0,
  ];

  const [values, setValues] = useState(filter?.values ?? [0, 0]);
  const firstValue = values[0] ?? sliderMin;
  const secondValue = values[1] ?? firstValue;

  const isNumberRange =
    filter && numberFilterOperators[filter.operator].target === "multiple";

  const setFilterOperatorDebounced = useDebounceCallback(
    actions.setFilterOperator,
    500,
  );
  const setNumberFilterValue = useCallback(
    (targetColumn: Column<TData, "number">, nextValues: number[]) => {
      actions.setFilterValue(targetColumn, nextValues);
    },
    [actions],
  );
  const setFilterValueDebounced = useDebounceCallback(
    setNumberFilterValue,
    500,
  );

  const changeNumber = (value: number | readonly number[]) => {
    const next = typeof value === "number" ? [value] : [...value];
    setValues(next);
    setFilterValueDebounced(column, next);
  };

  const changeMinNumber = (value: number) => {
    const newValues = createNumberRange([value, secondValue]);
    setValues(newValues);
    setFilterValueDebounced(column, newValues);
  };

  const changeMaxNumber = (value: number) => {
    const newValues = createNumberRange([firstValue, value]);
    setValues(newValues);
    setFilterValueDebounced(column, newValues);
  };

  const changeType = useCallback(
    (type: "single" | "range") => {
      let newValues: number[] = [];
      if (type === "single") newValues = [firstValue];
      else if (!minMax)
        newValues = createNumberRange([firstValue, secondValue]);
      else {
        const value = firstValue;
        newValues =
          value - minMax[0] < minMax[1] - value
            ? createNumberRange([value, minMax[1]])
            : createNumberRange([minMax[0], value]);
      }

      const newOperator = type === "single" ? "is" : "is between";

      setValues(newValues);

      // Cancel in-flight debounced calls to prevent flicker/race conditions
      setFilterOperatorDebounced.cancel();
      setFilterValueDebounced.cancel();

      actions.setFilterOperator(column.id, newOperator);
      actions.setFilterValue(column, newValues);
    },
    [
      values,
      firstValue,
      secondValue,
      column,
      actions,
      minMax,
      setFilterOperatorDebounced,
      setFilterValueDebounced,
    ],
  );

  return (
    <Command>
      <CommandList className="w-[300px] p-2">
        <CommandGroup>
          <div className="flex flex-col w-full">
            <Tabs
              value={isNumberRange ? "range" : "single"}
              onValueChange={(v) => changeType(v as "single" | "range")}
            >
              <TabsList className="w-full *:text-xs">
                <TabsTrigger value="single">{t("single", locale)}</TabsTrigger>
                <TabsTrigger value="range">{t("range", locale)}</TabsTrigger>
              </TabsList>
              <TabsContent value="single" className="flex flex-col gap-4 mt-4">
                {minMax && (
                  <Slider
                    value={[firstValue]}
                    onValueChange={(value) => changeNumber(value)}
                    min={sliderMin}
                    max={sliderMax}
                    step={1}
                    aria-orientation="horizontal"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {t("value", locale)}
                  </span>
                  <DebouncedInput
                    id="single"
                    type="number"
                    value={firstValue.toString()}
                    onChange={(v) => changeNumber([Number(v)])}
                  />
                </div>
              </TabsContent>
              <TabsContent value="range" className="flex flex-col gap-4 mt-4">
                {minMax && (
                  <Slider
                    value={[firstValue, secondValue]}
                    onValueChange={changeNumber}
                    min={sliderMin}
                    max={sliderMax}
                    step={1}
                    aria-orientation="horizontal"
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {t("min", locale)}
                    </span>
                    <DebouncedInput
                      type="number"
                      value={firstValue}
                      onChange={(v) => changeMinNumber(Number(v))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {t("max", locale)}
                    </span>
                    <DebouncedInput
                      type="number"
                      value={secondValue}
                      onChange={(v) => changeMaxNumber(Number(v))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
