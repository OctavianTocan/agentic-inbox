"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPlatform, type Platform } from "../helpers";
import { useDebouncedCallback } from "./use-debounce";

export interface UseKeyBindingConfig {
  keys: string | string[];
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
  target?: "window" | "element" | React.RefObject<HTMLElement>;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  convertCtrlToCmd?: boolean;
  sequenceTimeout?: number;
}

export interface UseKeyBindingReturn {
  hint: string;
  platform: Platform;
  isActive: boolean;
  sequenceKeys: string[];
}

type Keys = UseKeyBindingConfig["keys"];

interface ParsedKeyBinding {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

interface KeySequence {
  keys: ParsedKeyBinding[];
  isSequence: boolean;
}

const WHITESPACE_REGEX = /\s+/;

/** Parses one "ctrl+shift+k" combo into its key name and modifier flags. */
const parseSingleKey = (keyString: string): ParsedKeyBinding => {
  const parts = keyString.toLowerCase().trim().split("+");
  const keyName = parts.at(-1) ?? "";

  return {
    key: keyName,
    ctrl: parts.includes("ctrl") || parts.includes("cmd"),
    alt: parts.includes("alt") || parts.includes("option"),
    shift: parts.includes("shift"),
    meta: parts.includes("meta") || parts.includes("win"),
  };
};

/** Parses a binding string into its combos, flagged as a multi-step sequence. */
const parseKeyBinding = (keyString: string): KeySequence => {
  const sequenceParts = keyString.trim().split(WHITESPACE_REGEX);

  return {
    keys: sequenceParts.map(parseSingleKey),
    isSequence: sequenceParts.length > 1,
  };
};

/** Whether a modifier's required state matches the event's actual state. */
const modifierMatches = (expected: boolean, actual: boolean): boolean => {
  return expected === actual;
};

/** Whether a keyboard event satisfies one parsed combo's key and modifiers. */
const matchesSingleKey = (
  event: KeyboardEvent,
  binding: ParsedKeyBinding,
  convertCtrlToCmd: boolean,
): boolean => {
  const platform = getPlatform();

  if (event.key.toLowerCase() !== binding.key.toLowerCase()) {
    return false;
  }

  const shouldConvert = convertCtrlToCmd && platform === "mac";
  const ctrlPressed = shouldConvert ? event.metaKey : event.ctrlKey;
  const metaPressed = shouldConvert ? event.ctrlKey : event.metaKey;

  return (
    modifierMatches(binding.ctrl, ctrlPressed) &&
    modifierMatches(binding.alt, event.altKey) &&
    modifierMatches(binding.shift, event.shiftKey) &&
    modifierMatches(binding.meta, metaPressed)
  );
};

/** Display label for the ctrl modifier (⌘ on Mac when converting ctrl→cmd). */
const getCtrlLabel = (
  platform: Platform,
  convertCtrlToCmd: boolean,
): string => {
  if (convertCtrlToCmd && platform === "mac") {
    return "\u2318";
  }
  return "Ctrl";
};

/** Display label for the meta modifier, or null when it has none to show. */
const getMetaLabel = (
  platform: Platform,
  convertCtrlToCmd: boolean,
): string | null => {
  if (platform === "mac" && !convertCtrlToCmd) {
    return "\u2318";
  }
  if (platform !== "mac") {
    return "Win";
  }
  return null;
};

/** Title-cases a key name, upper-casing single-character keys. */
const capitalizeKeyName = (key: string): string => {
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
};

/** Renders one combo as a platform-appropriate display string. */
const formatSingleKey = (
  binding: ParsedKeyBinding,
  platform: Platform,
  convertCtrlToCmd: boolean,
): string => {
  const parts: string[] = [];
  const isMac = platform === "mac";

  if (binding.ctrl) {
    parts.push(getCtrlLabel(platform, convertCtrlToCmd));
  }

  if (binding.alt) {
    parts.push(isMac ? "\u2325" : "Alt");
  }

  if (binding.shift) {
    parts.push(isMac ? "\u21E7" : "Shift");
  }

  if (binding.meta) {
    const metaLabel = getMetaLabel(platform, convertCtrlToCmd);
    if (metaLabel) {
      parts.push(metaLabel);
    }
  }

  parts.push(capitalizeKeyName(binding.key));

  return isMac ? parts.join("") : parts.join("+");
};

/**
 * Format a key combo for display ("⌘Enter" on Mac with `convertCtrlToCmd`,
 * "Ctrl+Enter" elsewhere). Exposed for UI hints that aren't attached to a
 * keybinding (e.g. modifier-held tutorial labels).
 *
 * @param keys - One binding string or several to join with " or ".
 * @param convertCtrlToCmd - When true, render `ctrl` as ⌘ on Mac.
 * @returns The formatted, platform-appropriate display string.
 */
export const formatKeyBinding = (
  keys: Keys,
  convertCtrlToCmd = true,
): string => {
  const platform = getPlatform();
  const keyArray = Array.isArray(keys) ? keys : [keys];

  return keyArray
    .map((keyString) => {
      const sequence = parseKeyBinding(keyString);

      if (sequence.isSequence) {
        return sequence.keys
          .map((key) => formatSingleKey(key, platform, convertCtrlToCmd))
          .join(" ");
      }
      const firstKey = sequence.keys[0];
      return firstKey === undefined
        ? ""
        : formatSingleKey(firstKey, platform, convertCtrlToCmd);
    })
    .join(" or ");
};

/**
 * Registers one or more keyboard shortcuts (single combos or multi-step
 * sequences) and fires a handler when one matches.
 *
 * @param config - Keys to bind, the `handler` to run on match, and options
 * for `enabled`, the listener `target`, `preventDefault` / `stopPropagation`,
 * Mac ctrl→cmd conversion, and the sequence timeout.
 * @returns A display `hint`, the detected `platform`, an `isActive` flag held
 * while a matched key is down, and the in-progress `sequenceKeys`.
 */
export const useKeyBinding = (
  config: UseKeyBindingConfig,
): UseKeyBindingReturn => {
  const {
    keys,
    handler,
    enabled = true,
    target = "window",
    preventDefault = true,
    stopPropagation = false,
    convertCtrlToCmd = true,
    sequenceTimeout = 800,
  } = config;

  const [isActive, setIsActive] = useState(false);
  const [sequenceKeys, setSequenceKeys] = useState<string[]>([]);
  const sequenceKeysRef = useRef<ParsedKeyBinding[]>([]);

  const platform = useMemo(() => getPlatform(), []);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const parsedBindings = useMemo(() => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return keyArray.map(parseKeyBinding);
  }, [keys]);

  const resetSequence = useDebouncedCallback(() => {
    sequenceKeysRef.current = [];
    setSequenceKeys([]);
  }, sequenceTimeout);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleSequenceBinding = (
      event: KeyboardEvent,
      binding: KeySequence,
    ): boolean => {
      const currentKeyIndex = sequenceKeysRef.current.length;

      if (currentKeyIndex >= binding.keys.length) {
        return false;
      }

      const expectedKey = binding.keys[currentKeyIndex];
      if (expectedKey === undefined) {
        return false;
      }

      if (!matchesSingleKey(event, expectedKey, convertCtrlToCmd)) {
        sequenceKeysRef.current = [];
        setSequenceKeys([]);
        return false;
      }

      sequenceKeysRef.current.push(expectedKey);
      setSequenceKeys((prev) => [
        ...prev,
        formatSingleKey(expectedKey, platform, convertCtrlToCmd),
      ]);

      if (sequenceKeysRef.current.length === binding.keys.length) {
        sequenceKeysRef.current = [];
        setSequenceKeys([]);
        return true;
      }

      resetSequence();
      return false;
    };

    const matchesSingleKeyBinding = (
      event: KeyboardEvent,
      binding: KeySequence,
    ): boolean => {
      const firstKey = binding.keys[0];
      if (
        firstKey === undefined ||
        !matchesSingleKey(event, firstKey, convertCtrlToCmd)
      ) {
        return false;
      }
      sequenceKeysRef.current = [];
      setSequenceKeys([]);
      return true;
    };

    const findMatchingBinding = (event: KeyboardEvent): boolean => {
      for (const binding of parsedBindings) {
        const matched = binding.isSequence
          ? handleSequenceBinding(event, binding)
          : matchesSingleKeyBinding(event, binding);
        if (matched) {
          return true;
        }
      }
      return false;
    };

    const applyEventModifiers = (event: KeyboardEvent) => {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
    };

    const handleKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      const matched = findMatchingBinding(event);

      if (matched) {
        applyEventModifiers(event);
        setIsActive(true);
        handlerRef.current(event);
      }
    };

    const handleKeyUp = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      setIsActive(false);
    };

    let targetElement: Window | HTMLElement | null = null;

    if (target === "window") {
      targetElement = window;
    } else if (target === "element") {
      return;
    } else if (target && "current" in target) {
      targetElement = target.current;
    }

    if (!targetElement) {
      return;
    }

    targetElement.addEventListener("keydown", handleKeyDown);
    targetElement.addEventListener("keyup", handleKeyUp);

    return () => {
      targetElement?.removeEventListener("keydown", handleKeyDown);
      targetElement?.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    enabled,
    parsedBindings,
    target,
    preventDefault,
    stopPropagation,
    convertCtrlToCmd,
    platform,
    resetSequence,
  ]);

  return {
    hint: formatKeyBinding(keys, convertCtrlToCmd),
    platform,
    isActive,
    sequenceKeys,
  };
};

/**
 * Builds element props that bind a shortcut locally rather than on the window,
 * for controls that should only react while focused.
 *
 * @param config - Same shape as {@link useKeyBinding}; only single combos are
 * matched here (sequences are ignored).
 * @returns `aria-label`, `title`, and an `onKeyDown` handler to spread onto an
 * element.
 */
export const createKeyBindingProps = (config: UseKeyBindingConfig) => {
  const {
    keys,
    handler,
    preventDefault = true,
    stopPropagation = false,
    convertCtrlToCmd = true,
  } = config;

  const hint = formatKeyBinding(keys, convertCtrlToCmd);
  const parsedBindings = Array.isArray(keys)
    ? keys.map(parseKeyBinding)
    : [parseKeyBinding(keys)];

  return {
    "aria-label": hint,
    title: hint,
    onKeyDown: (event: React.KeyboardEvent) => {
      let matched = false;

      for (const binding of parsedBindings) {
        const firstKey = binding.keys[0];
        if (
          !binding.isSequence &&
          firstKey !== undefined &&
          matchesSingleKey(event.nativeEvent, firstKey, convertCtrlToCmd)
        ) {
          matched = true;
          break;
        }
      }

      if (matched) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }

        handler(event.nativeEvent);
      }
    },
  };
};
