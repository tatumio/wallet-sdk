import { PORTAL_ENCLAVE_BASE_URL } from '../constants/index.js';
import { buildRequestOptions } from '../operation.js';
import { createPortalApiClient } from './transport.js';
import type { Curve } from './types/index.js';
import type { RequestOptions, WalletsSDKConfig } from '../types.js';
import type {
  BackupWalletBody,
  BackupWalletResponse,
  GenerateWalletResponse,
  PortalRequestOptions,
  RawSignBody,
  RawSignResponse,
  RecoverWalletBody,
  RecoverWalletResponse,
  SendAssetsBody,
  SendAssetsResponse,
  SignBody,
  SignResponse
} from './types/index.js';

export const enclaveOperations = {
  generateWallet: { method: 'POST', path: '/v1/generate' },
  backupWallet: { method: 'POST', path: '/v1/backup' },
  recoverWallet: { method: 'POST', path: '/v1/recover' },
  sign: { method: 'POST', path: '/v1/sign' },
  rawSign: { method: 'POST', path: '/v1/raw/sign/{curve}' },
  sendAssets: { method: 'POST', path: '/v1/assets/send' }
} as const;

export type EnclaveOperation = keyof typeof enclaveOperations;

/**
 * Enclave MPC layer (`/v1/...`). Operates on key shares;
 * authenticates with the client's own token (Bearer) and never touches
 * the Tatum API key. Chain operations (`sign`/`sendAssets`) require the caller
 * to supply an `rpcUrl`. Internal — exposed through {@link WalletsClient}.
 */
export class EnclaveApi {
  constructor(
    private readonly token: string,
    private readonly sdkConfig: WalletsSDKConfig
  ) {}

  request<TResponse = unknown>(operationName: EnclaveOperation, options: RequestOptions = {}): Promise<TResponse> {
    const operation = enclaveOperations[operationName];
    const client = createPortalApiClient(this.sdkConfig, this.token, PORTAL_ENCLAVE_BASE_URL);

    return client.request<TResponse>(buildRequestOptions(operation.method, operation.path, options));
  }

  generateWallet<TResponse = GenerateWalletResponse>(options?: PortalRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('generateWallet', { ...options, body: {} });
  }

  backupWallet<TResponse = BackupWalletResponse>(
    options: PortalRequestOptions<BackupWalletBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('backupWallet', options);
  }

  recoverWallet<TResponse = RecoverWalletResponse>(
    options: PortalRequestOptions<RecoverWalletBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('recoverWallet', options);
  }

  sign<TResponse = SignResponse>(options: PortalRequestOptions<SignBody>): Promise<TResponse> {
    return this.request<TResponse>('sign', options);
  }

  rawSign<TResponse = RawSignResponse>(
    options: PortalRequestOptions<RawSignBody, { curve: Curve }>
  ): Promise<TResponse> {
    return this.request<TResponse>('rawSign', options);
  }

  sendAssets<TResponse = SendAssetsResponse>(
    options: PortalRequestOptions<SendAssetsBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('sendAssets', options);
  }
}
