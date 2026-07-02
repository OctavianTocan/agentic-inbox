import { memo } from "react";
import { FilterXIcon } from "@/design-system/components/icons";
import { Button } from "@/design-system/components/ui/button";
import { cn } from "@/design-system/lib/utils";
import type { DataTableFilterActions } from "../core/types";
import { type Locale, t } from "../lib/i18n";

interface FilterActionsProps {
  hasFilters: boolean;
  actions?: DataTableFilterActions;
  locale?: Locale;
}

export const FilterActions = memo(__FilterActions);

/** Renders the clear-filters action when any filters are active. */
function __FilterActions({
  hasFilters,
  actions,
  locale = "en",
}: FilterActionsProps) {
  return (
    <Button
      className={cn(
        "h-8 w-fit shrink-0 !px-2 text-muted-foreground",
        !hasFilters && "hidden",
      )}
      variant="ghost"
      onClick={actions?.removeAllFilters}
    >
      <FilterXIcon />
      <span className="hidden md:block">{t("clear", locale)}</span>
    </Button>
  );
}
