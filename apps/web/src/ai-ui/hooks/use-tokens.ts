"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** Default token delimiter: splits on runs of whitespace, keeping the separators. */
export const DEFAULT_DELIMITER = /(\s+)/;

interface UseTokensConfig {
  children: React.ReactNode;
  delimiter?: RegExp;
  streaming?: boolean;
}

/**
 * Splits rendered children into a token stream suitable for animated reveal.
 *
 * @param config - `children` to tokenize, an optional `delimiter`
 *   (defaults to {@link DEFAULT_DELIMITER}), and `streaming` to append only
 *   newly-appended text rather than re-splitting from scratch.
 * @returns The accumulated `tokens` array and the flattened `text`.
 */
export function useTokens(config: UseTokensConfig) {
  const { children, delimiter = DEFAULT_DELIMITER, streaming = true } = config;

  const text = useMemo(() => {
    return React.Children.toArray(children).join("");
  }, [children]);

  const previousTextRef = useRef("");
  const [tokens, setTokens] = useState<string[]>([]);

  useEffect(() => {
    const prevText = previousTextRef.current;

    if (streaming && text.startsWith(prevText)) {
      const newText = text.slice(prevText.length);
      if (newText) {
        const newTokens = newText.split(delimiter).filter(Boolean);
        setTokens((prev) => [...prev, ...newTokens]);
      }
    } else {
      const allTokens = text.split(delimiter).filter(Boolean);
      setTokens(allTokens);
    }

    previousTextRef.current = text;
  }, [text, delimiter, streaming]);

  return { tokens, text };
}
