import type { StreamTextSuccess } from './AiSdk';

export type AiStreamResult = StreamTextSuccess;

export const wrapStreamResult = (result: StreamTextSuccess): AiStreamResult =>
  result;
