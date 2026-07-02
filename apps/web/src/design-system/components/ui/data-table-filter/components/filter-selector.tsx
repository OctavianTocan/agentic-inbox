import {
  Fragment,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ListFilterIcon,
} from "@/design-system/components/icons";
import { Button } from "@/design-system/components/ui/button";
import { Checkbox } from "@/design-system/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/design-system/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/components/ui/popover";
import { cn } from "@/design-system/lib/utils";
import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterStrategy,
  FiltersState,
  OptionBasedColumnDataType,
} from "../core/types";
import { getColumn } from "../lib/helpers";
import { type Locale, t } from "../lib/i18n";
import { FilterValueController } from "./filter-value";

type FilterSelectorProps<TData> = {
  filters: FiltersState;
  columns: Column<TData>[];
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
  /** Override the default outline-button trigger; useful for compact surfaces. */
  renderTrigger?: (args: { hasFilters: boolean }) => React.ReactElement;
};

/** Popover that lists filterable columns and drills into a column's value editor. */
export const FilterSelector = memo(function FilterSelector<TData>({
  filters,
  columns,
  actions,
  strategy,
  locale = "en",
  renderTrigger,
}: FilterSelectorProps<TData>) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [property, setProperty] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);
  const closeTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const column = property ? getColumn(columns, property) : undefined;
  const filter = property
    ? filters.find((f) => f.columnId === property)
    : undefined;

  const hasFilters = filters.length > 0;
  const isSearchable = columns.length > 5;

  useEffect(() => {
    if (property && inputRef.current) {
      inputRef.current.focus();
    }
  }, [property]);

  useEffect(() => {
    if (open) return;
    const id = setTimeout(() => setValue(""), 150);
    closeTimeoutsRef.current.push(id);
    return () => {
      clearTimeout(id);
    };
  }, [open]);

  useEffect(
    () => () => {
      for (const id of closeTimeoutsRef.current) {
        clearTimeout(id);
      }
      closeTimeoutsRef.current = [];
    },
    [],
  );

  const content = useMemo(
    () =>
      property && column ? (
        <div className="flex flex-col">
          <Button
            variant="ghost"
            onClick={() => setProperty(undefined)}
            className="h-auto justify-start gap-1.5 rounded-none border-b px-2.5 py-2 text-left text-muted-foreground text-xs"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>{column.displayName}</span>
          </Button>
          <FilterValueController
            filter={filter}
            column={column}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
        </div>
      ) : isSearchable ? (
        <Command
          loop
          filter={(value, search, keywords) => {
            const extendValue = `${value} ${keywords?.join(" ")}`;
            return extendValue.toLowerCase().includes(search.toLowerCase())
              ? 1
              : 0;
          }}
        >
          <CommandInput
            value={value}
            onValueChange={setValue}
            ref={inputRef}
            placeholder={t("search", locale)}
          />
          <CommandEmpty>{t("noresults", locale)}</CommandEmpty>
          <CommandList className="max-h-fit">
            <CommandGroup>
              {columns.map((column) => (
                <FilterableColumn
                  key={column.id}
                  column={column}
                  setProperty={setProperty}
                />
              ))}
              <QuickSearchFilters
                search={value}
                filters={filters}
                columns={columns}
                actions={actions}
                strategy={strategy}
                locale={locale}
              />
            </CommandGroup>
          </CommandList>
        </Command>
      ) : (
        <Command loop ref={commandRef}>
          <CommandList className="max-h-fit">
            <CommandGroup>
              {columns.map((column) => (
                <FilterableColumn
                  key={column.id}
                  column={column}
                  setProperty={setProperty}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      ),
    [
      property,
      column,
      filter,
      filters,
      columns,
      actions,
      strategy,
      locale,
      value,
      isSearchable,
    ],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          const id = setTimeout(() => setProperty(undefined), 100);
          closeTimeoutsRef.current.push(id);
        }
      }}
    >
      {renderTrigger ? (
        <PopoverTrigger render={renderTrigger({ hasFilters })} />
      ) : (
        <PopoverTrigger
          render={<Button variant="outline" className="bg-input font-normal" />}
        >
          <ListFilterIcon className="size-4" />
          <span>{t("filter", locale)}</span>
        </PopoverTrigger>
      )}
      <PopoverContent
        align="start"
        side="bottom"
        className="w-fit p-0 origin-(--radix-popover-content-transform-origin)"
        initialFocus={isSearchable ? inputRef : commandRef}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}) as <TData>(props: FilterSelectorProps<TData>) => React.JSX.Element;

type FilterableColumnProps<TData, TType extends ColumnDataType, TVal> = {
  column: Column<TData, TType, TVal>;
  setProperty: (value: string) => void;
};

/** Selectable command row for one column; prefetches its options on hover or focus. */
export function FilterableColumn<TData, TType extends ColumnDataType, TVal>({
  column,
  setProperty,
}: FilterableColumnProps<TData, TType, TVal>) {
  const itemRef = useRef<HTMLDivElement>(null);

  const prefetch = useCallback(() => {
    column.prefetchOptions();
    column.prefetchValues();
    column.prefetchFacetedUniqueValues();
    column.prefetchFacetedMinMaxValues();
  }, [column]);

  useEffect(() => {
    const target = itemRef.current;
    if (!target) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const isSelected = target.getAttribute("data-selected") === "true";
          if (isSelected) prefetch();
        }
      }
    });

    observer.observe(target, {
      attributes: true,
      attributeFilter: ["data-selected"],
    });

    return () => observer.disconnect();
  }, [prefetch]);

  return (
    <CommandItem
      ref={itemRef}
      value={column.id}
      keywords={[column.displayName]}
      onSelect={() => setProperty(column.id)}
      className="group"
      onMouseEnter={prefetch}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <column.icon strokeWidth={2.25} className="size-4" />
          <span>{column.displayName}</span>
        </div>
        <ArrowRightIcon className="size-4 shrink-0 opacity-0 group-data-[selected=true]:opacity-100" />
      </div>
    </CommandItem>
  );
}

type QuickSearchFiltersProps<TData> = {
  search?: string;
  filters: FiltersState;
  columns: Column<TData>[];
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
};

/** Type-guard narrowing a column to the option/multiOption variants. */
function isOptionLikeColumn<TData>(
  column: Column<TData>,
): column is Column<TData, OptionBasedColumnDataType> {
  return column.type === "option" || column.type === "multiOption";
}

/** Inline option toggles surfaced when the search matches option-like columns. */
export const QuickSearchFilters = memo(function QuickSearchFilters<TData>({
  search,
  filters,
  columns,
  actions,
  locale = "en",
}: QuickSearchFiltersProps<TData>) {
  const cols = useMemo(() => columns.filter(isOptionLikeColumn), [columns]);

  if (!search || search.trim().length < 2) return null;

  return (
    <>
      {cols.map((column) => {
        const filter = filters.find((f) => f.columnId === column.id);
        const options = column.getOptions();
        const optionsCount = column.getFacetedUniqueValues();

        /** Toggles a single option value on the column's filter. */
        function handleOptionSelect(value: string, check: boolean): void {
          if (check) actions.addFilterValue(column, [value]);
          else actions.removeFilterValue(column, [value]);
        }

        return (
          <Fragment key={column.id}>
            {options.map((v) => {
              const checked = Boolean(filter?.values.includes(v.value));
              const count = optionsCount?.get(v.value) ?? 0;

              return (
                <CommandItem
                  key={v.value}
                  value={v.value}
                  keywords={[v.label, v.value]}
                  onSelect={() => {
                    handleOptionSelect(v.value, !checked);
                  }}
                  className="group"
                >
                  <div className="group flex items-center gap-1.5">
                    <Checkbox
                      checked={checked}
                      className="opacity-0 data-[state=checked]:opacity-100 group-data-[selected=true]:opacity-100 dark:border-ring mr-1"
                    />
                    <div className="flex w-4 items-center justify-center">
                      {v.icon &&
                        (isValidElement(v.icon) ? (
                          v.icon
                        ) : (
                          <v.icon className="size-4 text-primary" />
                        ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-muted-foreground">
                        {column.displayName}
                      </span>
                      <ChevronRightIcon className="size-3.5 text-muted-foreground/75" />
                      <span>
                        {v.label}
                        <sup
                          className={cn(
                            !optionsCount && "hidden",
                            "ml-0.5 tabular-nums tracking-tight text-muted-foreground",
                            count === 0 && "slashed-zero",
                          )}
                        >
                          {count < 100 ? count : "100+"}
                        </sup>
                      </span>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );
}) as <TData>(
  props: QuickSearchFiltersProps<TData>,
) => React.JSX.Element | null;
