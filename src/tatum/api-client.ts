import { TATUM_API_BASE_URL } from '../constants/index.js';
import { HttpClient } from '../http.js';
import type { ApiRequestOptions, WalletsSDKConfig } from '../types.js';

export class WalletsApiClient extends HttpClient {
  constructor(config: WalletsSDKConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required for custodian / sdk.api operations');
    }

    const apiKey = config.apiKey;

    super({
      baseUrl: config.baseUrl ?? TATUM_API_BASE_URL,
      headers: config.headers,
      fetch: config.fetch,
      errorLabel: 'Wallets API',
      applyAuth: (headers) => {
        headers['x-api-key'] = apiKey;
      }
    });
  }

  get<TResponse = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}
  ): Promise<TResponse> {
    return this.request<TResponse>({ ...options, method: 'GET', path });
  }

  post<TResponse = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}
  ): Promise<TResponse> {
    return this.request<TResponse>({ ...options, method: 'POST', path, body });
  }

  put<TResponse = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}
  ): Promise<TResponse> {
    return this.request<TResponse>({ ...options, method: 'PUT', path, body });
  }

  patch<TResponse = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}
  ): Promise<TResponse> {
    return this.request<TResponse>({ ...options, method: 'PATCH', path, body });
  }

  delete<TResponse = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}
  ): Promise<TResponse> {
    return this.request<TResponse>({ ...options, method: 'DELETE', path });
  }
}

export type { ApiRequestOptions, HttpMethod, QueryParams, WalletsSDKConfig } from '../types.js';
