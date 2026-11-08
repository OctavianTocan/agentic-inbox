import type * as React from "react";

/**
 * Merges several refs into one callback ref so a single element can feed
 * multiple consumers — e.g. an internal observer ref plus a
 * caller-forwarded ref. Handles both callback and object refs and skips
 * nullish entries.
 *
 * @param refs - The refs to merge; callback, object, or nullish.
 * @returns A callback ref that assigns the node to every provided ref.
 */
export function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
}
