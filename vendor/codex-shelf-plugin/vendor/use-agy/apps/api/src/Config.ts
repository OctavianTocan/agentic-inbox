import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

/** Default loopback host for the local-only API. */
export const DEFAULT_HOST = '127.0.0.1';

/** Default local API port. */
export const DEFAULT_PORT = 4897;

const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
]);

/** Validated host and port for the Bun API server. */
export interface ServerConfig {
  readonly hostname: string;
  readonly port: number;
}

/** Error raised when config attempts to bind outside loopback. */
export class UnsafeBindHostError extends Schema.TaggedErrorClass<UnsafeBindHostError>()(
  'UnsafeBindHostError',
  { host: Schema.String }
) {}

/** Error raised when the configured port is not usable by Bun. */
export class InvalidPortError extends Schema.TaggedErrorClass<InvalidPortError>()(
  'InvalidPortError',
  { value: Schema.String }
) {}

/** Raw environment input accepted by the API config parser. */
export interface ServerConfigEnv {
  readonly host?: string | undefined;
  readonly port?: string | undefined;
}

/**
 * Checks whether a host value is allowed for the local-only API.
 *
 * @param host - Hostname or IP address to validate.
 * @returns Whether the host is loopback-only.
 */
export const isLocalHost = (host: string): boolean => LOCAL_HOSTS.has(host);

/**
 * Parses a port string into the Bun server port range.
 *
 * @param value - Optional raw port value.
 * @returns Valid TCP port.
 * @errors InvalidPortError when the value is outside the valid range.
 */
export const parsePort = (
  value: string | undefined
): Effect.Effect<number, InvalidPortError> => {
  if (value === undefined || value.length === 0) {
    return Effect.succeed(DEFAULT_PORT);
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return Effect.fail(new InvalidPortError({ value }));
  }

  return Effect.succeed(port);
};

/**
 * Parses local API server config from raw environment values.
 *
 * @param env - Raw host and port values.
 * @returns Validated local-only server config.
 * @errors UnsafeBindHostError when the host is not loopback-only.
 * @errors InvalidPortError when the port value is invalid.
 */
export const parseServerConfig = (
  env: ServerConfigEnv
): Effect.Effect<ServerConfig, UnsafeBindHostError | InvalidPortError> =>
  Effect.gen(function* () {
    const hostname = env.host ?? DEFAULT_HOST;
    if (!isLocalHost(hostname)) {
      return yield* new UnsafeBindHostError({ host: hostname });
    }

    const port = yield* parsePort(env.port);
    return { hostname, port };
  });

/**
 * Loads runtime server config from the current process environment.
 *
 * @returns Validated local-only server config.
 * @errors UnsafeBindHostError when the host is not loopback-only.
 * @errors InvalidPortError when the port value is invalid.
 */
export const loadServerConfig: Effect.Effect<
  ServerConfig,
  UnsafeBindHostError | InvalidPortError
> = Effect.sync(() => readBunEnv()).pipe(Effect.flatMap(parseServerConfig));

/**
 * Formats a validated server config as an HTTP origin.
 *
 * @param config - Server config to render.
 * @returns HTTP origin for local callers.
 */
export const serverOrigin = (config: ServerConfig): string =>
  `http://${config.hostname}:${config.port}`;

/**
 * Formats startup config failures for stderr.
 *
 * @param error - Error raised while loading config.
 * @returns Human-readable diagnostic.
 */
export const formatConfigError = (error: unknown): string => {
  if (error instanceof UnsafeBindHostError) {
    return `Refusing to bind use-agy API to non-local host ${error.host}.`;
  }

  if (error instanceof InvalidPortError) {
    return `Invalid USE_AGY_API_PORT value ${error.value}.`;
  }

  return error instanceof Error
    ? error.message
    : 'Unexpected API startup error';
};

/** Reads the environment variables used by the local API runtime. */
function readBunEnv(): ServerConfigEnv {
  return {
    host: process.env.USE_AGY_API_HOST,
    port: process.env.USE_AGY_API_PORT,
  };
}
