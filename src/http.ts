import { WalletsApiError } from './errors.js';
import type { ApiRequestOptions, QueryValue } from './types.js';

/**
 * Mutates the outgoing header map to add an authentication header. Each API
 * surface supplies its own strategy (e.g. `x-api-key` for Tatum, bearer token
 * for the MPC API) so the transport stays auth-agnostic.
 */
export type ApplyAuthHeaders = (headers: Record<string, string>) => void;

export interface HttpClientConfig {
  baseUrl: string;
  applyAuth: ApplyAuthHeaders;
  /** Prefix for thrown error messages, e.g. `'Wallets API'` or `'MPC API'`. */
  errorLabel: string;
  headers?: Record<string, string> | undefined;
  fetch?: typeof fetch | undefined;
}

/**
 * Shared fetch-based transport. Builds URLs and headers, serializes JSON bodies,
 * parses responses, and throws {@link WalletsApiError} on non-2xx. Subclasses
 * differ only in their auth strategy and error label.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly applyAuth: ApplyAuthHeaders;
  private readonly errorLabel: string;

  constructor(config: HttpClientConfig) {
    if (!config.fetch && typeof fetch === 'undefined') {
      throw new Error('A fetch implementation is required in this runtime.');
    }

    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.defaultHeaders = normalizeHeaders(config.headers);
    this.fetchImpl = config.fetch ?? fetch;
    this.applyAuth = config.applyAuth;
    this.errorLabel = config.errorLabel;
  }

  async request<TResponse = unknown>(options: ApiRequestOptions): Promise<TResponse> {
    const method = options.method ?? 'GET';
    const url = buildUrl(this.baseUrl, options.path, options.query);
    const headers = this.buildHeaders(options.headers, options.body);
    const requestInit: RequestInit = {
      method,
      headers
    };
    const body = serializeBody(options.body);

    if (body !== undefined) {
      requestInit.body = body;
    }

    if (options.signal !== undefined) {
      requestInit.signal = options.signal;
    }

    const response = await this.fetchImpl(url, requestInit);
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new WalletsApiError(`${this.errorLabel} request failed with status ${response.status}`, {
        status: response.status,
        statusText: response.statusText || undefined,
        body: responseBody,
        headers: response.headers
      });
    }

    return responseBody as TResponse;
  }

  private buildHeaders(headers: Record<string, string> | undefined, body: unknown): Record<string, string> {
    const requestHeaders: Record<string, string> = {
      accept: 'application/json',
      ...this.defaultHeaders,
      ...normalizeHeaders(headers)
    };

    this.applyAuth(requestHeaders);

    if (body !== undefined && !isBodyInit(body) && !hasHeader(requestHeaders, 'content-type')) {
      requestHeaders['content-type'] = 'application/json';
    }

    return requestHeaders;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function buildUrl(baseUrl: string, path: string, query?: ApiRequestOptions['query']): string {
  const normalizedPath = path.replace(/^\/+/, '');
  const url = new URL(normalizedPath, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      const values = Array.isArray(value) ? value : [value];

      for (const item of values) {
        appendQueryValue(url, key, item);
      }
    }
  }

  return url.toString();
}

function appendQueryValue(url: URL, key: string, value: QueryValue): void {
  if (value === undefined || value === null) {
    return;
  }

  url.searchParams.append(key, String(value));
}

function normalizeHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) {
    return {};
  }

  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (isBodyInit(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
  );
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text);
  }

  return text;
}
