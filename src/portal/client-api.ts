import { PORTAL_API_BASE_URL } from '../constants/index.js';
import { buildRequestOptions } from '../operation.js';
import { createPortalApiClient } from './transport.js';
import type { WalletChain } from '../chains.js';
import type { RequestOptions, WalletsSDKConfig } from '../types.js';
import type {
  BackupShareCipherTextResponse,
  BuildTransactionBody,
  BuildTransactionResponse,
  ClientDetails,
  ClientEjectableBackupSharesQuery,
  ClientEjectableBackupSharesResponse,
  EvaluateTransactionBody,
  EvaluateTransactionQuery,
  EvaluateTransactionResponse,
  PortalRequestOptions,
  StoreBackupShareBody,
  UpdateBackupSharePairsBody,
  UpdateSigningSharePairsBody
} from './types/index.js';

export const clientOperations = {
  getClientDetails: { method: 'GET', path: '/clients/me' },
  buildTransaction: { method: 'POST', path: '/clients/me/chains/{chain}/assets/send/build-transaction' },
  evaluateTransaction: { method: 'POST', path: '/clients/me/evaluate-transaction' },
  updateSigningSharePairs: { method: 'PATCH', path: '/clients/me/signing-share-pairs' },
  updateBackupSharePairs: { method: 'PATCH', path: '/clients/me/backup-share-pairs' },
  storeEncryptedBackupShare: { method: 'PATCH', path: '/clients/me/backup-share-pairs/{backupSharePairId}' },
  getBackupShareCipherText: {
    method: 'GET',
    path: '/clients/me/backup-share-pairs/{backupSharePairId}/cipher-text'
  },
  getEjectableBackupShares: { method: 'GET', path: '/clients/me/wallets/{walletId}/ejectable-backup-shares' },
  completeEject: { method: 'PATCH', path: '/clients/me/wallets/{walletId}/complete-eject' }
} as const;

export type ClientOperation = keyof typeof clientOperations;

/**
 * Client-scoped Portal REST layer (`/clients/me/...`). Authenticates with the
 * client's own Portal API key / Client Session Token. Internal — exposed to
 * consumers through {@link WalletsClient}.
 */
export class ClientApi {
  constructor(
    private readonly token: string,
    private readonly sdkConfig: WalletsSDKConfig
  ) {}

  request<TResponse = unknown>(operationName: ClientOperation, options: RequestOptions = {}): Promise<TResponse> {
    const operation = clientOperations[operationName];
    const client = createPortalApiClient(this.sdkConfig, this.token, PORTAL_API_BASE_URL);

    return client.request<TResponse>(buildRequestOptions(operation.method, operation.path, options));
  }

  getClientDetails<TResponse = ClientDetails>(options?: PortalRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('getClientDetails', options);
  }

  buildTransaction<TResponse = BuildTransactionResponse>(
    options: PortalRequestOptions<BuildTransactionBody, { chain: WalletChain }>
  ): Promise<TResponse> {
    return this.request<TResponse>('buildTransaction', options);
  }

  evaluateTransaction<TResponse = EvaluateTransactionResponse>(
    options: PortalRequestOptions<EvaluateTransactionBody, never, EvaluateTransactionQuery>
  ): Promise<TResponse> {
    return this.request<TResponse>('evaluateTransaction', options);
  }

  updateSigningSharePairs<TResponse = void>(
    options: PortalRequestOptions<UpdateSigningSharePairsBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('updateSigningSharePairs', options);
  }

  updateBackupSharePairs<TResponse = void>(
    options: PortalRequestOptions<UpdateBackupSharePairsBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('updateBackupSharePairs', options);
  }

  storeEncryptedBackupShare<TResponse = void>(
    options: PortalRequestOptions<StoreBackupShareBody, { backupSharePairId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('storeEncryptedBackupShare', options);
  }

  getBackupShareCipherText<TResponse = BackupShareCipherTextResponse>(
    options: PortalRequestOptions<never, { backupSharePairId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('getBackupShareCipherText', options);
  }

  getEjectableBackupShares<TResponse = ClientEjectableBackupSharesResponse>(
    options: PortalRequestOptions<never, { walletId: string }, ClientEjectableBackupSharesQuery>
  ): Promise<TResponse> {
    return this.request<TResponse>('getEjectableBackupShares', options);
  }

  completeEject<TResponse = void>(
    options: PortalRequestOptions<never, { walletId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('completeEject', options);
  }
}
