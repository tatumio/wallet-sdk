import type { PathParamValue } from './path.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

export interface WalletsSDKConfig {
  baseUrl?: string;
  /** Tatum API key (`x-api-key`). Required only for custodian / `sdk.api` operations. */
  apiKey?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

export interface ApiRequestOptions {
  method?: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Shared per-call options for every generated API wrapper. `method` and `path`
 * are supplied by the operation map, not the caller; `path` here is the map of
 * path parameters used to fill the operation's `{param}` placeholders.
 */
export interface RequestOptions extends Omit<ApiRequestOptions, 'method' | 'path'> {
  path?: Record<string, PathParamValue | null | undefined>;
}

export interface ApiErrorOptions {
  status: number;
  statusText?: string | undefined;
  body?: unknown;
  headers?: Headers;
}
