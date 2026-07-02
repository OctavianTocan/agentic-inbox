/**
 * HTTP fetch command — demonstrates @effect/platform HttpClient integration.
 *
 * Demonstrates:
 * - Using platform services (HttpClient) provided at the app layer
 * - Importing args/options from Arguments.ts
 * - No explicit Command.provide needed — HttpClient comes from MainLayer
 *
 * Usage:
 *   example-cli fetch <url>
 *   example-cli fetch --headers <url>
 */
import { Command } from '@effect/cli';
import { HttpClient } from '@effect/platform';
import { Console, Effect } from 'effect';
import * as FetchArgs from './Arguments';

/** Fetch a URL and print the response body or headers. */
export const FetchCommand = Command.make(
  'fetch',
  { url: FetchArgs.url, headersOnly: FetchArgs.headersOnly },
  ({ url, headersOnly }) =>
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const response = yield* client.get(url);

      if (headersOnly) {
        for (const [key, value] of Object.entries(response.headers)) {
          yield* Console.log(`${key}: ${value}`);
        }
        return;
      }

      const body = yield* response.text;
      yield* Console.log(body);
    })
).pipe(Command.withDescription('Fetch a URL and print the response'));
