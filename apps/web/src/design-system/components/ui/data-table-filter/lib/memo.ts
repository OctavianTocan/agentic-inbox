const UNSET = Symbol("memo.unset");

/**
 * Memoizes the result of `compute` while the shallow-equal `getDeps` output is
 * unchanged. Recomputes once on first call and again on each dep change.
 *
 * @template TDeps - The dependency-array type.
 * @template TResult - The computed-result type.
 * @param getDeps - Snapshots the current dependency tuple.
 * @param compute - Computes the result from the latest deps.
 * @param _options - Diagnostic key for the cache slot.
 * @returns A getter that returns the cached or freshly computed result.
 */
export function memo<TDeps extends readonly unknown[], TResult>(
  getDeps: () => TDeps,
  compute: (deps: TDeps) => TResult,
  _options: { key: string },
): () => TResult {
  let prevDeps: TDeps | undefined;
  let cachedResult: TResult | typeof UNSET = UNSET;

  return () => {
    const deps = getDeps();

    if (cachedResult === UNSET || !prevDeps || !shallowEqual(prevDeps, deps)) {
      cachedResult = compute(deps);
      prevDeps = deps;
    }

    return cachedResult;
  };
}

/** Shallow array equality; both arrays must be the same length and identity-equal at each index. */
function shallowEqual<T>(arr1: readonly T[], arr2: readonly T[]): boolean {
  if (arr1 === arr2) return true;
  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}
