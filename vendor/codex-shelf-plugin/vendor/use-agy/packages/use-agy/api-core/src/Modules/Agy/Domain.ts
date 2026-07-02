import * as Schema from 'effect/Schema';

/** Public availability status for the local AGY runtime. */
export const AgyStatus = Schema.Literals(['available', 'unavailable']);

export type AgyStatus = Schema.Schema.Type<typeof AgyStatus>;

/** Public request schema for text and JSON AGY runs. */
export const AgyRunRequest = Schema.Struct({
  prompt: Schema.String,
  cwd: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  sandbox: Schema.optional(Schema.String),
  addDirs: Schema.optional(Schema.Array(Schema.String)),
  timeout: Schema.optional(Schema.String),
});

export type AgyRunRequest = Schema.Schema.Type<typeof AgyRunRequest>;

/** Public response schema for text-mode AGY runs. */
export const AgyTextRunResponse = Schema.Struct({
  stdout: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
});

export type AgyTextRunResponse = Schema.Schema.Type<typeof AgyTextRunResponse>;

/** Public response schema for AGY runs parsed as strict JSON. */
export const AgyJsonRunResponse = Schema.Struct({
  value: Schema.Unknown,
  raw: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
});

export type AgyJsonRunResponse = Schema.Schema.Type<typeof AgyJsonRunResponse>;
