import { interpolatePath } from './path.js';
import type { ApiRequestOptions, HttpMethod, RequestOptions } from './types.js';

/**
 * Turns an operation definition plus per-call options into a concrete
 * {@link ApiRequestOptions}: interpolates path params and copies only the
 * fields that were actually provided (to respect `exactOptionalPropertyTypes`).
 */
export function buildRequestOptions(
  method: HttpMethod,
  pathTemplate: string,
  options: RequestOptions
): ApiRequestOptions {
  const requestOptions: ApiRequestOptions = {
    method,
    path: interpolatePath(pathTemplate, options.path)
  };

  if (options.query !== undefined) {
    requestOptions.query = options.query;
  }

  if (options.body !== undefined) {
    requestOptions.body = options.body;
  }

  if (options.headers !== undefined) {
    requestOptions.headers = options.headers;
  }

  if (options.signal !== undefined) {
    requestOptions.signal = options.signal;
  }

  return requestOptions;
}
