/**
 * Formats a duration in milliseconds as a human-readable string.
 *
 * @param durationMs - Duration to format; negative values are clamped to zero.
 * @param compact - When true, uses short unit suffixes (1h 3m); otherwise spelled-out units (1 hour 3 minutes).
 * @returns The formatted duration, falling back to a zero-second string when no unit is present.
 */
export function formatDuration(durationMs: number, compact = true): string {
  const ms = Math.max(0, durationMs);
  const secondsTotal = Math.floor(ms / 1000);
  const minutesTotal = Math.floor(secondsTotal / 60);
  const hoursTotal = Math.floor(minutesTotal / 60);
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;
  const minutes = minutesTotal % 60;
  const seconds = secondsTotal % 60;

  const units: Array<{ key: "d" | "h" | "m" | "s"; value: number }> = [
    { key: "d", value: days },
    { key: "h", value: hours },
    { key: "m", value: minutes },
    { key: "s", value: seconds },
  ];

  const parts: string[] = [];
  for (const unit of units) {
    if (unit.value <= 0) {
      continue;
    }
    if (unit.key === "s" && parts.length > 0) {
      // Only show seconds if nothing else is present
      continue;
    }
    if (compact) {
      parts.push(`${unit.value}${unit.key}`);
    } else {
      const labelMap: Record<typeof unit.key, string> = {
        d: "day",
        h: "hour",
        m: "minute",
        s: "second",
      } as const;
      const label = labelMap[unit.key];
      const plural = unit.value === 1 ? "" : "s";
      parts.push(`${unit.value} ${label}${plural}`);
    }
  }

  if (parts.length === 0) {
    return compact ? "0s" : "0 seconds";
  }
  return parts.join(" ");
}
