"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseCopyToClipboardParams {
  /** Time in milliseconds before resetting copied state */
  timeout?: number;
}

interface UseCopyToClipboardReturn {
  /** Whether the text was successfully copied */
  isCopied: boolean;
  /** Error that occurred during copy */
  error: Error | null;
  /** Function to copy text to clipboard */
  copy: (value: string) => Promise<boolean>;
}

/**
 * Copies text to the clipboard and exposes the result as transient state.
 *
 * @param params - Options bag; `timeout` sets how long `isCopied` stays true (ms, default 1000).
 * @returns The `isCopied` flag, the last `error`, and a `copy` action resolving to whether the write succeeded.
 */
function useCopyToClipboard(
  params: UseCopyToClipboardParams = {},
): UseCopyToClipboardReturn {
  const { timeout = 1000 } = params;
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (value: string) => {
      if (!value) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        setError(null);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
          timeoutRef.current = null;
        }, timeout);

        return true;
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error("Failed to copy to clipboard");
        setError(e);
        setIsCopied(false);
        return false;
      }
    },
    [timeout],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useMemo(
    () => ({
      isCopied,
      error,
      copy,
    }),
    [isCopied, error, copy],
  );
}

export {
  type UseCopyToClipboardParams,
  type UseCopyToClipboardReturn,
  useCopyToClipboard,
};
