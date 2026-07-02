import type { ReactNode } from "react";

import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "../../../components/icons";
import { cn } from "../../../lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";

type FilesProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Tree-style container that renders a list of `Folder` and `File` items.
 *
 * @param props - Files container props.
 * @param props.children - Tree rows: `Folder` and `File` components.
 * @param props.className - Extra classes merged onto the container.
 * @returns The rendered file tree.
 */
export function Files({ children, className }: FilesProps) {
  return (
    <div
      className={cn(
        "not-prose my-6 rounded-lg border bg-card p-3 text-card-foreground text-sm",
        className,
      )}
      data-slot="docs-files"
    >
      {children}
    </div>
  );
}

type FolderProps = {
  readonly name: ReactNode;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Collapsible folder row inside a `Files` tree. Children render at the next indent level.
 *
 * @param props - Folder props.
 * @param props.name - Display name shown next to the folder icon.
 * @param props.defaultOpen - When true, the folder starts expanded.
 * @param props.children - Nested `Folder` and `File` items.
 * @param props.className - Extra classes merged onto the trigger row.
 * @returns The rendered folder row.
 */
export function Folder({
  name,
  defaultOpen = false,
  children,
  className,
}: FolderProps) {
  return (
    <Collapsible data-slot="docs-folder" defaultOpen={defaultOpen}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent",
          className,
        )}
      >
        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90" />
        <FolderIcon className="size-4 shrink-0 text-muted-foreground group-data-[panel-open]:hidden" />
        <FolderOpenIcon className="hidden size-4 shrink-0 text-muted-foreground group-data-[panel-open]:block" />
        <span className="truncate">{name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 border-border/60 border-l pl-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type FileProps = {
  readonly name: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
};

/**
 * Leaf file row inside a `Files` tree.
 *
 * @param props - File props.
 * @param props.name - Display name shown next to the file icon.
 * @param props.icon - Override icon. Falls back to a generic file glyph.
 * @param props.className - Extra classes merged onto the row.
 * @returns The rendered file row.
 */
export function File({ name, icon, className }: FileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-1",
        className,
      )}
      data-slot="docs-file"
    >
      <span aria-hidden="true" className="size-3.5 shrink-0" />
      {icon ?? <FileIcon className="size-4 shrink-0 text-muted-foreground" />}
      <span className="truncate">{name}</span>
    </div>
  );
}
