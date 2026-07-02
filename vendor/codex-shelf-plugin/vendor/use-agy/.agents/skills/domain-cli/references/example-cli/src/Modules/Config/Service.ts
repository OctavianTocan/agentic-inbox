import { Effect, Option } from 'effect';

/**
 * In-memory key-value store service.
 *
 * Demonstrates the canonical Effect.Service pattern:
 * - Class extends Effect.Service<T>() with a unique identifier
 * - `scoped` generator yields dependencies and returns the service interface
 * - Methods wrapped with Effect.fn for tracing
 * - Consumers access via `yield* Store`
 * - Provided to commands via Command.provide(Store.Default)
 */
export class Store extends Effect.Service<Store>()('@example-cli/Store', {
  scoped: Effect.gen(function* () {
    const state = new Map<string, string>();

    /**
     * Look up a value by key.
     * @param key - The configuration key to look up.
     * @returns Option.some with the value, or Option.none if not found.
     */
    const get = Effect.fn('Store.get')(function* (key: string) {
      return yield* Effect.sync(() => Option.fromNullable(state.get(key)));
    });

    /**
     * Set a key to a value, creating or overwriting.
     * @param key - The configuration key.
     * @param value - The value to store.
     */
    const set = Effect.fn('Store.set')(function* (key: string, value: string) {
      yield* Effect.sync(() => state.set(key, value));
    });

    /**
     * List all stored key-value pairs.
     * @returns All entries as an array of [key, value] tuples.
     */
    const list = Effect.fn('Store.list')(function* () {
      return yield* Effect.sync(
        () =>
          Array.from(state.entries())
      );
    });

    return { get, set, list } as const;
  }),
}) {}
