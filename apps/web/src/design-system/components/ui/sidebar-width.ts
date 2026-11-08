const SIDEBAR_WIDTH_COOKIE_NAME = 'sidebar_width';

/**
 * Parse and clamp a persisted sidebar width cookie value.
 *
 * @param rawValue - The raw cookie value (or `undefined` when absent).
 * @param defaultWidth - Fallback width when the value is missing or unparseable.
 * @param minWidth - Lower clamp bound in pixels.
 * @param maxWidth - Upper clamp bound in pixels.
 * @returns The parsed width clamped to `[minWidth, maxWidth]`, or `defaultWidth`.
 */
function parseWidthCookie(
  rawValue: string | undefined,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number
): number {
  if (rawValue === undefined) {
    return defaultWidth;
  }
  const val = Number.parseInt(rawValue, 10);
  if (Number.isNaN(val)) {
    return defaultWidth;
  }
  return Math.max(minWidth, Math.min(maxWidth, val));
}

export { parseWidthCookie, SIDEBAR_WIDTH_COOKIE_NAME };
