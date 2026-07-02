import { LoaderIcon } from "@/design-system/components/icons";
import { cn } from "../../lib/utils";

/** Spinning loader icon with a status role for assistive tech. */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
