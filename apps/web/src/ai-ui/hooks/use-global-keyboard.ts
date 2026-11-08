"use client";

import { type RefObject, useEffect, useRef } from "react";

export interface UseGlobalKeyboardOptions {
  enabled: boolean;
  /**
   * Element whose DOM focus marks this consumer as the active target (e.g.
   * the composer's textarea). While its composer holds the user's last
   * focus, global keystrokes and pastes route here instead of to the most
   * recently registered target.
   */
  activityRef?: RefObject<HTMLElement | null>;
  onKeyPress: (key: string, event: KeyboardEvent) => void;
  /** Receives clipboard files (e.g. a copied image) and plain text in one shot; files take precedence over text. Return true when consumed; the browser default runs otherwise. */
  onPaste?: (
    clipboard: { readonly text: string; readonly files: readonly File[] },
    event: ClipboardEvent,
  ) => boolean;
}

/** Registry entry reading the registrant's latest options on every dispatch. */
type GlobalKeyboardTarget = {
  getOptions: () => UseGlobalKeyboardOptions;
  getActivityElement: () => HTMLElement | null;
};

/** Enabled registrants in registration order; later entries win the fallback. */
const targets = new Set<GlobalKeyboardTarget>();

/** Registrant whose activity element most recently held DOM focus. */
let lastActiveTarget: GlobalKeyboardTarget | null = null;

/** True for elements that handle their own keystrokes and must not be displaced. */
function isInteractiveElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "button" ||
    tagName === "select" ||
    element.hasAttribute("contenteditable") ||
    element.getAttribute("role") === "button"
  );
}

/** Picks the dispatch target: last-focused registrant, else last-registered. */
function resolveActiveTarget(): GlobalKeyboardTarget | undefined {
  if (lastActiveTarget !== null && targets.has(lastActiveTarget)) {
    return lastActiveTarget;
  }
  let lastRegistered: GlobalKeyboardTarget | undefined;
  for (const target of targets) {
    lastRegistered = target;
  }
  return lastRegistered;
}

/** Records which registrant owns the focused element, if any. */
function handleWindowFocusIn(event: FocusEvent): void {
  if (!(event.target instanceof Node)) {
    return;
  }
  for (const target of targets) {
    const element = target.getActivityElement();
    if (element?.contains(event.target)) {
      lastActiveTarget = target;
      return;
    }
  }
}

/** Routes a plain printable keystroke to the active target. */
function handleWindowKeyDown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key.length !== 1) {
    return;
  }
  if (isInteractiveElement(document.activeElement)) {
    return;
  }
  const target = resolveActiveTarget();
  target?.getOptions().onKeyPress(event.key, event);
}

/** Routes a paste landing outside any input to the active target. */
function handleWindowPaste(event: ClipboardEvent): void {
  if (isInteractiveElement(document.activeElement)) {
    return;
  }
  const onPaste = resolveActiveTarget()?.getOptions().onPaste;
  if (!onPaste) {
    return;
  }
  const files = Array.from(event.clipboardData?.files ?? []);
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (files.length === 0 && text.length === 0) {
    return;
  }
  // The consumer decides whether it owns this paste; only then suppress the
  // browser default so an unhandled paste still lands wherever focus is.
  if (onPaste({ text, files }, event)) {
    event.preventDefault();
  }
}

/** Installs the shared window listeners backing all registrants. */
function attachWindowListeners(): void {
  window.addEventListener("keydown", handleWindowKeyDown);
  window.addEventListener("paste", handleWindowPaste);
  window.addEventListener("focusin", handleWindowFocusIn);
}

/** Removes the shared window listeners once no registrant remains. */
function detachWindowListeners(): void {
  window.removeEventListener("keydown", handleWindowKeyDown);
  window.removeEventListener("paste", handleWindowPaste);
  window.removeEventListener("focusin", handleWindowFocusIn);
}

/**
 * Focuses global typing and pastes onto a single owner even when several
 * consumers (composers) are mounted at once. All enabled hook instances
 * share one set of window listeners, and each keystroke or paste dispatches
 * to exactly one of them: the instance whose `activityRef` element most
 * recently held focus, falling back to the most recently mounted instance.
 *
 * @param options - Enablement flag, activity element, and event callbacks;
 * callbacks are read fresh on every dispatch, so unstable identities never
 * re-register the target or shuffle its fallback priority.
 */
export const useGlobalKeyboard = (options: UseGlobalKeyboardOptions): void => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { enabled } = options;
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const target: GlobalKeyboardTarget = {
      getOptions: () => optionsRef.current,
      getActivityElement: () => optionsRef.current.activityRef?.current ?? null,
    };
    if (targets.size === 0) {
      attachWindowListeners();
    }
    targets.add(target);

    return () => {
      targets.delete(target);
      if (lastActiveTarget === target) {
        lastActiveTarget = null;
      }
      if (targets.size === 0) {
        detachWindowListeners();
      }
    };
  }, [enabled]);
};
