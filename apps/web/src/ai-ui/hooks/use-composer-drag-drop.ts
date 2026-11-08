"use client";

import * as React from "react";

/**
 * Drag-and-drop file intake for the composer form. Tracks the drag-over state
 * for styling and forwards dropped files to `ingestFiles`, which owns the
 * inline-vs-upload decision (see `ComposerProvider`).
 */
export function useComposerDragDrop(
  ingestFiles: (files: readonly File[]) => void,
) {
  const [dragActive, setDragActive] = React.useState(false);

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
    (e: React.DragEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        ingestFiles(files);
      }
    },
    [ingestFiles],
  );

  return {
    dragActive,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
