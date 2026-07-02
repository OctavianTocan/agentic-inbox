"use client";

import type { Table } from "@tanstack/react-table";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "../../../lib/utils";
import { XIcon } from "../../icons";
import { Button } from "../button";
import { Separator } from "../separator";
import { Spinner } from "../spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

export interface DataTableActionBarProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
  visible?: boolean;
  container?: Element | DocumentFragment | null;
}

/** Floating action bar shown at the bottom of a data table while rows are selected. */
function DataTableActionBar<TData>({
  table,
  visible: visibleProp,
  container: containerProp,
  children,
  className,
  ...props
}: DataTableActionBarProps<TData>) {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        table.toggleAllRowsSelected(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [table]);

  const container =
    containerProp ?? (mounted ? globalThis.document?.body : null);

  if (!container) {
    return null;
  }

  const visible =
    visibleProp ?? table.getFilteredSelectedRowModel().rows.length > 0;

  return ReactDOM.createPortal(
    <div>
      {visible && (
        <div
          aria-orientation="horizontal"
          className={cn(
            "fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 mx-auto flex w-fit flex-wrap items-center justify-center gap-2 rounded-md border bg-background p-2 text-foreground shadow-sm",
            className,
          )}
          role="toolbar"
          {...props}
        >
          {children}
        </div>
      )}
    </div>,
    container,
  );
}

interface DataTableActionBarActionProps
  extends React.ComponentProps<typeof Button> {
  tooltip?: string;
  isPending?: boolean;
}

/** Individual action button rendered inside the floating DataTableActionBar. */
function DataTableActionBarAction({
  size = "sm",
  tooltip,
  isPending,
  disabled,
  className,
  children,
  ...props
}: DataTableActionBarActionProps) {
  const buttonProps = {
    className: cn(
      "gap-1.5 border border-secondary bg-secondary/50 hover:bg-secondary/70 [&>svg]:size-3.5",
      size === "icon" ? "size-7" : "h-7",
      className,
    ),
    disabled: disabled || isPending,
    size,
    variant: "secondary" as const,
    ...props,
  };

  const buttonChildren = isPending ? <Spinner /> : children;

  if (!tooltip) {
    return <Button {...buttonProps}>{buttonChildren}</Button>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...buttonProps} />}>
        {buttonChildren}
      </TooltipTrigger>
      <TooltipContent
        className="border bg-accent font-semibold text-foreground dark:bg-zinc-900 [&>span]:hidden"
        sideOffset={6}
      >
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface DataTableActionBarSelectionProps<TData> {
  table: Table<TData>;
}

/** Selected-row count badge with a clear button, shown inside the DataTableActionBar. */
function DataTableActionBarSelection<TData>({
  table,
}: DataTableActionBarSelectionProps<TData>) {
  const onClearSelection = React.useCallback(() => {
    table.toggleAllRowsSelected(false);
  }, [table]);

  return (
    <div className="flex h-7 items-center rounded-md border pr-1 pl-2.5">
      <span className="whitespace-nowrap text-xs">
        {table.getFilteredSelectedRowModel().rows.length} selected
      </span>
      <Separator
        className="mr-1 ml-2 data-[orientation=vertical]:h-4"
        orientation="vertical"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className="size-5"
              onClick={onClearSelection}
              size="icon"
              variant="ghost"
            />
          }
        >
          <XIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent
          className="flex items-center gap-2 border bg-accent px-2 py-1 font-semibold text-foreground dark:bg-zinc-900 [&>span]:hidden"
          sideOffset={10}
        >
          <p>Clear selection</p>
          <kbd className="select-none rounded border bg-background px-1.5 py-px font-mono font-normal text-[0.7rem] text-foreground shadow-xs">
            <abbr className="no-underline" title="Escape">
              Esc
            </abbr>
          </kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
};
