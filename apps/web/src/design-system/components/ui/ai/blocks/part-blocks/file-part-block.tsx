"use client";

import type { ComponentProps } from "react";
import { usePart } from "@/ai-ui/providers/part-provider";
import { FileIcon } from "@/design-system/components/icons";
import { cn } from "../../../../../lib/utils";
import { Img } from "../../../img";

export interface FilePartBlockProps extends ComponentProps<"div"> {}

/** Renders a message file part: inline preview for images, a labeled chip otherwise. */
export const FilePartBlock = ({ className, ...props }: FilePartBlockProps) => {
  const { part } = usePart({ type: "file" });

  const isImage = part.mediaType?.startsWith("image/");
  // Sandbox-path urls (absolute paths) are not fetchable by the browser;
  // only inline/hosted urls can back an <img>.
  const hasRenderableUrl =
    part.url.startsWith("data:") || part.url.startsWith("http");

  if (isImage && hasRenderableUrl) {
    return (
      <Img
        alt={part.filename ?? "Attached image"}
        className={cn("max-h-64 rounded-md object-contain", className)}
        src={part.url}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2",
        className,
      )}
      {...props}
    >
      <FileIcon className="size-5 text-muted-foreground" />
      <span className="text-sm">{part.filename ?? "Attached file"}</span>
    </div>
  );
};
