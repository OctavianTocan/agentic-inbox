/**
 * Formats a date for `en-US` display, defaulting to a long month/day/year.
 *
 * @param date - Date, ISO/parseable string, or epoch milliseconds; undefined yields an empty string.
 * @param opts - Intl formatting overrides; `month`/`day`/`year` default to `long`/`numeric`/`numeric`.
 * @returns The formatted date, or an empty string for missing or unparseable input.
 */
export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date));
  } catch (_err) {
    return "";
  }
}
