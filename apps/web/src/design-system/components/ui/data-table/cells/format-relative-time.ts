/**
 * Formats a date as a human-readable relative time string.
 *
 * @param date - The instant to describe relative to `now`.
 * @param now - Reference instant the result is measured against; defaults to the current time.
 * @returns A short relative string such as "5m ago", "in 2h", or "just now".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const sec = Math.floor(absMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);

  let value: number;
  let unit: string;
  if (year >= 1) {
    value = year;
    unit = "y";
  } else if (month >= 1) {
    value = month;
    unit = "mo";
  } else if (day >= 1) {
    value = day;
    unit = "d";
  } else if (hr >= 1) {
    value = hr;
    unit = "h";
  } else if (min >= 1) {
    value = min;
    unit = "m";
  } else {
    value = sec;
    unit = "s";

    if (value < 10) {
      return "just now";
    }
  }

  return future ? `in ${value}${unit}` : `${value}${unit} ago`;
}
