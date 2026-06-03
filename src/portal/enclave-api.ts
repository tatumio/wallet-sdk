import { PORTAL_ENCLAVE_BASE_URL } from '../constants/index.js';
import { buildRequestOptions } from '../operation.js';
import { createPortalApiClient } from './transport.js';
import type { Curve } from './types/index.js';
import type { PortalTatumProvider } from '../tatum/provider.js';
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
 * Enclave MPC layer (`mpc-client.portalhq.io/v1/...`). Operates on key shares;
 * auto-injects a Tatum-resolved `rpcUrl` (from the body's `chain`/`chainId`)
 * when one is not already present. Internal — exposed through {@link WalletsClient}.
 */
export class EnclaveApi {
  constructor(
    private readonly token: string,
    private readonly provider: PortalTatumProvider,
    private readonly sdkConfig: WalletsSDKConfig
  ) {}

  async request<TResponse = unknown>(operationName: EnclaveOperation, options: RequestOptions = {}): Promise<TResponse> {
    const operation = enclaveOperations[operationName];
    const client = createPortalApiClient(this.sdkConfig, this.token, PORTAL_ENCLAVE_BASE_URL);
    const requestOptions = buildRequestOptions(operation.method, operation.path, {
      ...options,
      body: await this.withResolvedRpcUrl(options.body)
    });

    return client.request<TResponse>(requestOptions);
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

  private async withResolvedRpcUrl(body: unknown): Promise<unknown> {
    if (!isRecord(body) || typeof body.rpcUrl === 'string') {
      return body;
    }

    const chain =
      typeof body.chain === 'string' ? body.chain : typeof body.chainId === 'string' ? body.chainId : undefined;

    if (!chain) {
      return body;
    }

    return {
      ...body,
      rpcUrl: await this.provider.getRpcUrl(chain)
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
