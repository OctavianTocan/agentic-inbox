# Effect Scheduling Reference

## Quick Reference

| Schedule | Delays | Stops | Use Case |
|----------|--------|-------|----------|
| `Schedule.forever` | None | Never | Infinite loop |
| `Schedule.once` | None | After 1 | One-time retry |
| `Schedule.recurs(n)` | None | After n | Fixed retries |
| `Schedule.spaced(d)` | Fixed (from end) | Never | Polling |
| `Schedule.fixed(d)` | Fixed (from start) | Never | Regular intervals |
| `Schedule.exponential(b)` | b, 2b, 4b... | Never | Backoff |
| `Schedule.fibonacci(b)` | b, b, 2b, 3b, 5b... | Never | Gradual backoff |

| Combinator | Continues When | Delay | Use Case |
|------------|----------------|-------|----------|
| `union` | Either allows | Shorter | Fallback |
| `intersect` | Both allow | Longer | Bounded backoff |
| `andThen` | First then second | Sequential | Phased retry |
| `jittered` | Original allows | +/-20% | Distributed systems |

| Function | Initial Run | Stops On |
|----------|-------------|----------|
| `Effect.repeat` | Yes | First failure |
| `Effect.repeatN` | Yes | After n |
| `Effect.schedule` | No | Schedule end |
| `Effect.retry` | Yes | First success |

## Built-in Schedules

```typescript
import { Effect, Schedule } from "effect"

// Fixed repetitions
Effect.repeat(action, Schedule.forever)
Effect.repeat(action, Schedule.once)         // 2 total (initial + 1)
Effect.repeat(action, Schedule.recurs(5))    // 5 total

// Intervals (spaced: from end, fixed: from start)
Effect.repeat(action, Schedule.spaced("1 second"))
Effect.repeat(action, Schedule.fixed("1 second"))

// Backoff strategies
Effect.retry(action, Schedule.exponential("100 millis"))  // 100, 200, 400...
Effect.retry(action, Schedule.fibonacci("100 millis"))    // 100, 100, 200, 300...
```

## Schedule Combinators

```typescript
import { Effect, Schedule, Console } from "effect"

// Union: EITHER allows, SHORTER delay
const union = Schedule.union(
  Schedule.exponential("100 millis"),
  Schedule.spaced("1 second")
)

// Intersect: BOTH allow, LONGER delay (use to bound retries)
const bounded = Schedule.intersect(
  Schedule.exponential("100 millis"),
  Schedule.recurs(5)
)

// Sequential: first schedule, then second
const phased = Schedule.andThen(
  Schedule.recurs(3),
  Schedule.spaced("5 seconds")
)

// Jitter: random +/-20% (prevents thundering herd)
const jittered = Schedule.exponential("100 millis").pipe(Schedule.jittered)

// Filter by output/input
const maxTen = Schedule.whileOutput(Schedule.forever, (n) => n < 10)
const untilDone = Schedule.whileInput(
  Schedule.spaced("1 second"),
  (r: { done: boolean }) => !r.done
)

// Add logging
const logged = Schedule.tapOutput(
  Schedule.recurs(5),
  (n) => Console.log(`Attempt ${n}`)
)
```

## Canonical Retry Policy

Exponential backoff with a per-delay cap, jitter, and a hard cap on total attempts. This is the default for transient failures (HTTP, DB, race conditions):

```typescript
const retryPolicy = Schedule.exponential('100 millis', 1.5).pipe(
  Schedule.either(Schedule.spaced('5 seconds')),
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(5)),
)
```

Reading the recipe:
- `Schedule.exponential(base, factor)` produces `100ms, 150ms, 225ms, ...`.
- `Schedule.either(Schedule.spaced('5 seconds'))` caps each delay; once exponential exceeds 5s, the spaced schedule wins. Effectively `min(exponential, 5s)`.
- `Schedule.jittered` adds randomness so many fibers don't retry in lockstep.
- `Schedule.intersect(Schedule.recurs(5))` caps the total number of attempts. Required: per the Best Practices below, retries must always be bounded.

Use as `Effect.retry({ schedule: retryPolicy, while: isRetryable })`. Tune base, factor, per-delay cap, and `recurs(n)` per call site; jitter is non-negotiable for any policy that runs across many fibers. Drop the `recurs` cap only at terminal sites that intentionally retry until success or interruption (rare; document the reason inline).

## Repetition Functions

```typescript
import { Effect, Schedule, Console, Ref } from "effect"

// repeat: initial + schedule (stops on failure)
Effect.repeat(action, Schedule.spaced("1 second"))

// repeatN: initial + n repetitions
Effect.repeatN(action, 2)  // Runs 3 times total

// schedule: NO initial, only schedule ticks
Effect.schedule(action, Schedule.spaced("1 second"))

// repeatOrElse: with error handler
Effect.repeatOrElse(
  action,
  Schedule.recurs(3),
  (error, count) => Console.log(`Failed after ${count}`)
)

yield* Effect.repeatWhile(action, (result) => result < 5)
yield* Effect.repeatUntil(action, (result) => result >= 5)
```

## Retry Patterns

```typescript
import { Effect, Schedule, Data } from "effect"

const retried = Effect.retry(
  unstableEffect,
  Schedule.exponential("100 millis").pipe(
    Schedule.jittered,
    Schedule.intersect(Schedule.recurs(5))
  )
)

// Conditional retry (only on specific errors)
class HttpError extends Schema.TaggedError<HttpError>()("HttpError", {
  status: Schema.Number,
}) {}

const conditionalRetry = Effect.retry(apiCall, {
  schedule: Schedule.exponential("200 millis").pipe(
    Schedule.intersect(Schedule.recurs(3))
  ),
  while: (error) => error.status >= 500
})
```

## Cron Scheduling

```
┌──────────── second (0-59)
│ ┌────────── minute (0-59)
│ │ ┌──────── hour (0-23)
│ │ │ ┌────── day of month (1-31)
│ │ │ │ ┌──── month (1-12)
│ │ │ │ │ ┌── day of week (0-7)
* * * * * *
```

| Pattern | Description |
|---------|-------------|
| `0 * * * * *` | Every minute |
| `0 0 * * * *` | Every hour |
| `0 0 0 * * *` | Daily at midnight |
| `0 */15 * * * *` | Every 15 minutes |
| `0 0 9-17 * * 1-5` | Hourly 9AM-5PM weekdays |

```typescript
import { Effect, Schedule, Cron, DateTime } from "effect"

const daily = Cron.unsafeParse("0 0 12 * * *", "UTC")
const parsed = Cron.parse("0 0 * * * *")

const cron = Cron.make({
  seconds: [0], minutes: [0], hours: [9],
  days: [], months: [], weekdays: [1, 2, 3, 4, 5],
  tz: DateTime.zoneUnsafeMakeNamed("UTC")
})

Effect.repeat(task, Schedule.cron(daily))

Cron.match(cron, new Date())
Cron.next(cron, new Date())
Cron.sequence(cron, new Date())
```

## Common Patterns

### Polling with Timeout

```typescript
const poll = Effect.retry(
  fetchData,
  Schedule.spaced("1 second").pipe(Schedule.intersect(Schedule.recurs(10)))
).pipe(Effect.timeout("30 seconds"))
```

### Exponential Backoff with Cap

```typescript
const capped = Schedule.exponential("100 millis").pipe(
  Schedule.union(Schedule.spaced("30 seconds")),  // cap each delay at 30s
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(10)),         // hard cap on total attempts
)
```

Order matters: apply per-delay caps (`union` / `either` with `spaced`) BEFORE the attempt-count cap (`intersect` with `recurs`). Reversing them would leave `union(spaced(...))` outside the `recurs` bound and the schedule would continue forever at the spaced interval after the recurs limit was reached.

### Heartbeat Pattern

```typescript
const program = Effect.gen(function* () {
  const heartbeat = yield* Effect.fork(
    Effect.repeat(ping, Schedule.spaced("5 seconds"))
  )
  const result = yield* mainOperation
  yield* Fiber.interrupt(heartbeat)
  return result
})
```

### Phased Retry

```typescript
const phased = Schedule.andThen(
  Schedule.recurs(3),  // 3 immediate
  Schedule.exponential("1 second").pipe(
    Schedule.jittered,
    Schedule.intersect(Schedule.recurs(5))
  )
)
```

## Best Practices

1. **Always bound retries** - Use `intersect(recurs(n))` to prevent infinite loops
2. **Add jitter** - Prevents thundering herd in distributed systems
3. **Choose strategy wisely**:
   - `spaced`: Polling, heartbeats
   - `fixed`: Clock-aligned tasks
   - `exponential`: Transient failures
   - `fibonacci`: Gradual backoff
4. **Combine schedules** - Use `andThen` for phased strategies
5. **Add observability** - Use `tapOutput` for logging
