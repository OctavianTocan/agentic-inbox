import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const DESKTOP_AUTO_FOCUS_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px) and (hover: hover) and (pointer: fine)`;

/**
 * Returns whether the viewport is below the shared mobile breakpoint.
 *
 * @returns `true` when the viewport is narrower than the mobile breakpoint.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Returns a ref callback that focuses an element only on desktop-like devices.
 *
 * Passive autofocus can open virtual keyboards on touch devices, so this checks
 * width, hover support, and pointer precision at mount time instead of render time.
 *
 * @template T - HTMLElement subtype receiving focus.
 * @returns Ref callback for the element that should receive passive autofocus.
 */
export function useDesktopAutoFocus<
  T extends HTMLElement,
>(): React.RefCallback<T> {
  const focusedNodeRef = React.useRef<T | null>(null);

  return React.useCallback((node) => {
    if (
      !node ||
      focusedNodeRef.current === node ||
      typeof window === "undefined" ||
      !window.matchMedia(DESKTOP_AUTO_FOCUS_QUERY).matches
    ) {
      return;
    }
    focusedNodeRef.current = node;
    node.focus();
  }, []);
}
