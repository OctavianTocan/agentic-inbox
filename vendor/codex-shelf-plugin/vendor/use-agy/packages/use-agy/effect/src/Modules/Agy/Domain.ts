import * as Schema from 'effect/Schema';

/** Availability status reported for the local AGY binary. */
export const AgyStatus = Schema.Literals(['available', 'unavailable']);
export type AgyStatus = Schema.Schema.Type<typeof AgyStatus>;

/** Captured text-mode AGY output. */
export const AgyTextResult = Schema.Struct({
  stdout: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
});
export type AgyTextResult = Schema.Schema.Type<typeof AgyTextResult>;

/** Captured AGY output after strict JSON parsing. */
export const AgyJsonResult = Schema.Struct({
  value: Schema.Unknown,
  raw: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
});
export type AgyJsonResult = Schema.Schema.Type<typeof AgyJsonResult>;

/** Request input shared by AGY text and JSON runs. */
export interface AgyRunInput {
  readonly prompt: string;
  readonly cwd?: string | undefined;
  readonly model?: string | undefined;
  readonly sandbox?: string | undefined;
  readonly addDirs?: ReadonlyArray<string> | undefined;
  readonly timeout?: string | undefined;
}

/** Process adapter input for either a status probe or prompt run. */
export interface AgyProcessInput extends AgyRunInput {
  readonly mode: 'status' | 'run';
}

/** Captured subprocess output from the raw AGY process adapter. */
export interface AgyProcessOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}
