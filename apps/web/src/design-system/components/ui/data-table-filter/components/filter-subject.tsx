import type { Column, ColumnDataType } from "../core/types";

interface FilterSubjectProps<TData, TType extends ColumnDataType> {
  column: Column<TData, TType>;
}

/** Renders a column's icon and display name as the subject label of a filter chip. */
export function FilterSubject<TData, TType extends ColumnDataType>({
  column,
}: FilterSubjectProps<TData, TType>) {
  const hasIcon = !!column.icon;
  return (
    <span className="flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap px-2.5 font-medium">
      {hasIcon && <column.icon className="size-4 stroke-[2.25px]" />}
      <span>{column.displayName}</span>
    </span>
  );
}
