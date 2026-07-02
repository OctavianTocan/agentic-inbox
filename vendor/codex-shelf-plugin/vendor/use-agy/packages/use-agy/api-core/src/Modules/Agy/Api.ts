import * as HttpApiEndpoint from 'effect/unstable/httpapi/HttpApiEndpoint';
import * as HttpApiGroup from 'effect/unstable/httpapi/HttpApiGroup';
import * as OpenApi from 'effect/unstable/httpapi/OpenApi';
import {
  AgyJsonRunResponse,
  AgyRunRequest,
  AgyStatus,
  AgyTextRunResponse,
} from './Domain';
import {
  AgyJsonParseErrorResponse,
  AgyRunErrorResponse,
  AgyUnavailableErrorResponse,
  AgyValidationErrorResponse,
} from './Errors';

/** HTTP API group for local AGY status and execution contracts. */
export const AgyApi = HttpApiGroup.make('agy')
  .add(
    HttpApiEndpoint.get('status', '/status', {
      success: AgyStatus,
      error: AgyUnavailableErrorResponse,
    }).annotate(OpenApi.Summary, 'AGY availability status')
  )
  .add(
    HttpApiEndpoint.post('runText', '/run/text', {
      payload: AgyRunRequest,
      success: AgyTextRunResponse,
      error: [
        AgyValidationErrorResponse,
        AgyRunErrorResponse,
        AgyUnavailableErrorResponse,
      ],
    }).annotate(OpenApi.Summary, 'Run AGY and return text output')
  )
  .add(
    HttpApiEndpoint.post('runJson', '/run/json', {
      payload: AgyRunRequest,
      success: AgyJsonRunResponse,
      error: [
        AgyValidationErrorResponse,
        AgyRunErrorResponse,
        AgyUnavailableErrorResponse,
        AgyJsonParseErrorResponse,
      ],
    }).annotate(OpenApi.Summary, 'Run AGY and parse JSON output')
  )
  .prefix('/agy');
