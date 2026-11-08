"use client";

import * as React from "react";
import { readAsDataURL } from "../helpers";
import type { Attachment } from "../types";

/**
 * Wires drag-and-drop and file reading for a composer's attachment surface.
 *
 * @param addAttachment - Callback invoked with each read file's content and
 * metadata (image files also carry a preview).
 * @returns `processFiles` to ingest a `FileList`, the `dragActive` flag, and
 * `handleDragOver` / `handleDragLeave` / `handleDrop` form event handlers.
 */
export function useFileProcessing(
  addAttachment: (attachment: Omit<Attachment, "id">) => void,
) {
  const [dragActive, setDragActive] = React.useState(false);

  const processFiles = React.useCallback(
    async (files: FileList) => {
      await Promise.all(
        Array.from(files).map(async (file) => {
          const content = await readAsDataURL(file);
          const isImage = file.type.startsWith("image/");

          const attachment: Omit<Attachment, "id"> = {
            name: file.name,
            type: file.type,
            size: file.size,
            content,
            ...(isImage && { preview: content }),
          };
          addAttachment(attachment);
        }),
      );
    },
    [addAttachment],
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    },
    [],
  );

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    },
    [],
  );

  const handleDrop = React.useCallback(
    async (e: React.DragEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  return {
    processFiles,
    dragActive,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
