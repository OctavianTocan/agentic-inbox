// Standalone condition-based waiting utilities for adapting inside repo tests.
// Keep examples generic so agents do not copy stale imports from another project.

type RecordedEvent = {
  readonly type: string;
  readonly payload?: unknown;
};

type EventReader = {
  readonly getEvents: () => readonly RecordedEvent[];
};

/** Waits until a condition returns a truthy value. */
export async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) {
      return result;
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Waits for the first recorded event with the requested type. */
export function waitForEvent(
  reader: EventReader,
  eventType: string,
  timeoutMs = 5000
): Promise<RecordedEvent> {
  return waitFor(
    () => reader.getEvents().find((event) => event.type === eventType),
    `${eventType} event`,
    timeoutMs
  );
}

/** Waits until at least the requested number of events have been recorded. */
export function waitForEventCount(
  reader: EventReader,
  eventType: string,
  count: number,
  timeoutMs = 5000
): Promise<readonly RecordedEvent[]> {
  return waitFor(
    () => {
      const matchingEvents = reader
        .getEvents()
        .filter((event) => event.type === eventType);
      return matchingEvents.length >= count ? matchingEvents : false;
    },
    `${count} ${eventType} events`,
    timeoutMs
  );
}

/** Waits for the first recorded event that satisfies a custom predicate. */
export function waitForEventMatch(
  reader: EventReader,
  predicate: (event: RecordedEvent) => boolean,
  description: string,
  timeoutMs = 5000
): Promise<RecordedEvent> {
  return waitFor(
    () => reader.getEvents().find(predicate),
    description,
    timeoutMs
  );
}

// Usage pattern:
//
// BEFORE, flaky:
// await new Promise((resolve) => setTimeout(resolve, 300));
// expect(events.filter((event) => event.type === "tool-result")).toHaveLength(2);
//
// AFTER, condition-based:
// await waitForEventCount(reader, "tool-call", 2);
// await waitForEventCount(reader, "tool-result", 2);
// expect(events.filter((event) => event.type === "tool-result")).toHaveLength(2);
