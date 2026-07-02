import * as Schema from 'effect/Schema';

/** AGY could not be reached or started locally. */
export class AgyUnavailableError extends Schema.TaggedErrorClass<AgyUnavailableError>()(
  'AgyUnavailableError',
  {}
) {
  declare readonly cause: unknown;

  constructor(props: { readonly cause?: unknown } = {}) {
    super({});
    this.cause = props.cause;
  }

  get message(): string {
    return 'AGY is unavailable';
  }
}

/** AGY subprocess execution failed before returning an exit code. */
export class AgyProcessError extends Schema.TaggedErrorClass<AgyProcessError>()(
  'AgyProcessError',
  {}
) {
  declare readonly cause: unknown;

  constructor(props: { readonly cause?: unknown }) {
    super({});
    this.cause = props.cause;
  }

  get message(): string {
    return 'AGY process failed';
  }
}

/** AGY returned a non-zero exit code with captured output. */
export class AgyExitError extends Schema.TaggedErrorClass<AgyExitError>()(
  'AgyExitError',
  {
    exitCode: Schema.Number,
    stdout: Schema.String,
    stderr: Schema.String,
  }
) {}

/** AGY text output could not be parsed as the requested strict JSON value. */
export class AgyJsonError extends Schema.TaggedErrorClass<AgyJsonError>()(
  'AgyJsonError',
  {
    raw: Schema.String,
  }
) {
  declare readonly cause: unknown;

  constructor(props: { readonly raw: string; readonly cause?: unknown }) {
    super({ raw: props.raw });
    this.cause = props.cause;
  }

  get message(): string {
    return 'AGY returned invalid JSON';
  }
}

export type AgyError =
  | AgyUnavailableError
  | AgyProcessError
  | AgyExitError
  | AgyJsonError;
