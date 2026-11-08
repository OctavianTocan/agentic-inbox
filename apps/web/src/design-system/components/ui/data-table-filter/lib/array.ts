/**
 * Returns elements that appear in both arrays (set intersection).
 *
 * @template T - The element type.
 * @param a - First array.
 * @param b - Second array.
 * @returns Elements present in both `a` and `b`, in `a` order.
 */
export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  return a.filter((x) => b.includes(x));
}

/** Stable string hash for any value used to bucket potential duplicates. */
function deepHash(
  value: unknown,
  cache = new WeakMap<object, string>(),
): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "number" || type === "boolean" || type === "string") {
    return `${type}:${String(value)}`;
  }
  if (type === "function") {
    return `function:${(value as (...args: never[]) => unknown).toString()}`;
  }

  if (type === "object") {
    const obj = value as object;
    const cached = cache.get(obj);
    if (cached !== undefined) {
      return cached;
    }
    let hash: string;
    if (Array.isArray(obj)) {
      hash = `array:[${obj.map((v) => deepHash(v, cache)).join(",")}]`;
    } else {
      const record = obj as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      const props = keys
        .map((k) => `${k}:${deepHash(record[k], cache)}`)
        .join(",");
      hash = `object:{${props}}`;
    }
    cache.set(obj, hash);
    return hash;
  }

  return `${type}:${String(value)}`;
}

/** Recursive structural equality for primitives, arrays, and plain objects. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined)
    return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    if (typeof b !== "object") return false;
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord).sort();
    const bKeys = Object.keys(bRecord).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      const aKey = aKeys[i];
      const bKey = bKeys[i];
      if (aKey === undefined || bKey === undefined) return false;
      if (aKey !== bKey) return false;
      if (!deepEqual(aRecord[aKey], bRecord[bKey])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Returns a new array with deep-equal duplicates removed, preserving the
 * first occurrence's order.
 *
 * @template T - The element type.
 * @param arr - The array of values to be filtered.
 * @returns A new array with duplicates removed.
 */
export function uniq<T>(arr: readonly T[]): T[] {
  const seen = new Map<string, T[]>();
  const result: T[] = [];

  for (const item of arr) {
    const hash = deepHash(item);
    const itemsWithHash = seen.get(hash);
    if (itemsWithHash) {
      let isDuplicate = false;
      for (const existing of itemsWithHash) {
        if (deepEqual(existing, item)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        itemsWithHash.push(item);
        result.push(item);
      }
    } else {
      seen.set(hash, [item]);
      result.push(item);
    }
  }

  return result;
}

/**
 * Returns the first `n` elements of an array.
 *
 * @template T - The element type.
 * @param a - The source array.
 * @param n - Maximum number of elements to keep.
 * @returns A new array with at most `n` elements.
 */
export function take<T>(a: readonly T[], n: number): T[] {
  return a.slice(0, n);
}

/**
 * Flattens a 2D array into a 1D array.
 *
 * @template T - The element type.
 * @param a - The nested array.
 * @returns A new flat array.
 */
export function flatten<T>(a: readonly T[][]): T[] {
  return a.flat();
}

/**
 * Appends `values` to `arr` and removes deep-equal duplicates.
 *
 * @template T - The element type.
 * @param arr - Existing array.
 * @param values - Values to append.
 * @returns A new array with duplicates removed.
 */
export function addUniq<T>(arr: readonly T[], values: readonly T[]): T[] {
  return uniq([...arr, ...values]);
}

/**
 * Removes any `values` that appear in `arr`.
 *
 * @template T - The element type.
 * @param arr - Existing array.
 * @param values - Values to remove.
 * @returns A new array without the removed values.
 */
export function removeUniq<T>(arr: readonly T[], values: readonly T[]): T[] {
  return arr.filter((v) => !values.includes(v));
}

/**
 * Tests whether `value` is in `values`.
 *
 * @template T - The element type.
 * @param value - The candidate value.
 * @param values - The set of acceptable values.
 * @returns True when `value` is present.
 */
export function isAnyOf<T>(value: T, values: readonly T[]): boolean {
  return values.includes(value);
}
