"use client";

import { useCallback } from "react";
import { useComposer } from "../composer/composer-provider";

/**
 * Headless container for suggestion buttons.
 *
 * Renders a plain `<div>` with `data-slot="suggestions"` — apply layout
 * styles via className or a parent stylesheet targeting the slot.
 */
export interface SuggestionsProps {
  className?: string;
  children: React.ReactNode;
}

export function Suggestions({ className, children }: SuggestionsProps) {
  return (
    <div className={className} data-slot="suggestions">
      {children}
    </div>
  );
}

/**
 * Headless suggestion button that submits its `label` through the composer
 * on click (or delegates to a custom `onClick` handler).
 *
 * Renders a plain `<button>` with `data-slot="suggestion"`.
 * If `children` are provided they are rendered as-is; otherwise the
 * component renders `icon` (if given) followed by the `label` text.
 */
export interface SuggestionProps {
  /** Text to submit to the composer when clicked. */
  label?: string;
  /** Optional icon component rendered before the label. */
  icon?: React.ComponentType;
  /** Override the default submit-on-click behavior. */
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function Suggestion({
  label,
  icon: Icon,
  onClick,
  className,
  children,
}: SuggestionProps) {
  const composer = useComposer();

  const submitSuggestion = useCallback(async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (label) {
      await composer.submit(label);
    }
  }, [onClick, label, composer]);

  return (
    <button
      className={className}
      data-slot="suggestion"
      onClick={submitSuggestion}
      type="button"
    >
      {children ?? (
        <>
          {Icon ? <Icon /> : null}
          {label}
        </>
      )}
    </button>
  );
}
