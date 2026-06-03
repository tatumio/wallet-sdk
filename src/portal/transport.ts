import { HttpClient } from '../http.js';
import type { WalletsSDKConfig } from '../types.js';

export interface PortalApiClientConfig {
  token: string;
  baseUrl: string;
  headers?: Record<string, string> | undefined;
  fetch?: typeof fetch | undefined;
}

export class PortalApiClient extends HttpClient {
  constructor(config: PortalApiClientConfig) {
    if (!config.token) {
      throw new Error('Portal token is required');
    }

    const token = config.token;

    super({
      baseUrl: config.baseUrl,
      headers: config.headers,
      fetch: config.fetch,
      errorLabel: 'Portal API',
      applyAuth: (headers) => {
        headers.authorization = `Bearer ${token}`;
      }
    });
  }
}

export function createPortalApiClient(
  config: Pick<WalletsSDKConfig, 'fetch' | 'headers'>,
  token: string,
  baseUrl: string
): PortalApiClient {
  return new PortalApiClient({
    token,
    baseUrl,
    headers: config.headers,
    fetch: config.fetch
  });
}
