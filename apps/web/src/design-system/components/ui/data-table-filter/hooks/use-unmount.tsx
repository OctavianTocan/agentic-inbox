import { useEffect, useRef } from "react";

/**
 * Runs `func` exactly once when the component unmounts.
 *
 * @param func - Cleanup function to run on unmount.
 */
export function useUnmount(func: () => void): void {
  const funcRef = useRef(func);

  funcRef.current = func;

  useEffect(
    () => () => {
      funcRef.current();
    },
    [],
  );
}
