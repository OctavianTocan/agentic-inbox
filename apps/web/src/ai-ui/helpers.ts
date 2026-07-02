import type { MouseEvent } from "react";

export type MessageTimingMetadata = {
  readonly totalMs?: number;
};

export type MessageUsageMetadata = {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
};

/**
 * Formats a duration in milliseconds to a human-readable string.
 * Values under 1000ms render as e.g. "42ms", otherwise "1.2s".
 *
 * @param ms - Duration in milliseconds.
 * @param minUnit - Minimum unit to display. "ms" (default) shows milliseconds, "s" rounds to seconds.
 */
export function formatDuration(ms: number, minUnit: "ms" | "s" = "ms"): string {
  if (minUnit === "s") {
    const seconds = ms / 1000;
    if (seconds < 10) {
      const fixed = seconds.toFixed(1);
      if (Number(fixed) < 10) {
        return `${fixed}s`;
      }
    }
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Return true when a value is a plain object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a numeric field from a metadata record. */
function readNumberField(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

/** Reads an object field from a metadata record. */
function readRecordField(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

/** Reads assistant timing metadata from unknown message metadata. */
export function readMessageTimingMetadata(
  metadata: unknown,
): MessageTimingMetadata | undefined {
  if (!isRecord(metadata)) {
    return;
  }
  const timing = readRecordField(metadata, "timing");
  if (timing === undefined) {
    return;
  }
  const totalMs = readNumberField(timing, "totalMs");
  return totalMs === undefined ? undefined : { totalMs };
}

/** Reads assistant usage metadata from unknown message metadata. */
export function readMessageUsageMetadata(
  metadata: unknown,
): MessageUsageMetadata | undefined {
  if (!isRecord(metadata)) {
    return;
  }
  const usage = readRecordField(metadata, "usage");
  if (usage === undefined) {
    return;
  }
  const inputTokens = readNumberField(usage, "inputTokens");
  const outputTokens = readNumberField(usage, "outputTokens");
  const totalTokens = readNumberField(usage, "totalTokens");
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return;
  }
  return { inputTokens, outputTokens, totalTokens };
}

/** Reads output tokens from assistant usage metadata. */
export function readMessageOutputTokens(metadata: unknown): number | undefined {
  return readMessageUsageMetadata(metadata)?.outputTokens;
}

/** Reads input tokens from assistant usage metadata. */
export function readMessageInputTokens(metadata: unknown): number | undefined {
  return readMessageUsageMetadata(metadata)?.inputTokens;
}

/** Reads total tokens from assistant usage metadata. */
export function readMessageTotalTokens(metadata: unknown): number | undefined {
  return readMessageUsageMetadata(metadata)?.totalTokens;
}

/**
 * Reads a file as a base64 data URL.
 *
 * @param file - File to read.
 * @returns Promise resolving to the file's `data:` URL.
 * @throws If the file cannot be read as a string.
 */
export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Expected string result from FileReader"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export type Platform = "mac" | "windows" | "linux";

/**
 * Detects the current OS family from the browser, defaulting to `'linux'`
 * during server-side rendering.
 *
 * @returns The detected platform.
 */
export const getPlatform = (): Platform => {
  if (typeof window === "undefined") {
    return "linux";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const navigatorPlatform = window.navigator.platform.toLowerCase();

  if (navigatorPlatform.includes("mac") || userAgent.includes("mac")) {
    return "mac";
  }
  if (navigatorPlatform.includes("win") || userAgent.includes("win")) {
    return "windows";
  }
  return "linux";
};

/**
 * Reports whether an element is (or sits inside) an interactive control such
 * as a button, link, or editable field.
 *
 * @param element - Element to test, including its ancestors.
 * @returns True when a click on it should be treated as interactive.
 */
export const isInteractiveElement = (element: HTMLElement): boolean => {
  return Boolean(
    element.closest(
      'button, input, textarea, a, [role="button"], [tabindex]',
    ) || element.hasAttribute("contenteditable"),
  );
};

/**
 * Builds a click handler that focuses a surface when the user clicks its
 * non-interactive area, leaving clicks on buttons, links, and inputs alone.
 *
 * @param options - `enabled` gates the behavior; `onFocus` runs on a
 * qualifying click.
 * @returns A mouse-event handler to attach to the surface.
 */
export const createClickToFocusHandler = ({
  enabled,
  onFocus,
}: {
  enabled: boolean;
  onFocus: () => void;
}) => {
  return (event: MouseEvent<HTMLElement>) => {
    if (!enabled) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const isFormOrNonInteractive =
      target === event.currentTarget || !isInteractiveElement(target);

    if (isFormOrNonInteractive) {
      if (event.button === 0 && event.detail === 1) {
        event.preventDefault();
      }
      onFocus();
    }
  };
};
