import { PORTAL_API_BASE_URL } from '../constants/index.js';
import { buildRequestOptions } from '../operation.js';
import { createPortalApiClient } from './transport.js';
import type { WalletChain } from '../chains.js';
import type { PortalTatumProvider } from '../tatum/provider.js';
import type { RequestOptions, WalletsSDKConfig } from '../types.js';
import type {
  BuildTransactionBody,
  BuildTransactionResponse,
  ClientDetails,
  CreateClientBody,
  CreateClientResponse,
  CreateClientSessionBody,
  CreateClientSessionResponse,
  EjectableBackupShares,
  EnableEjectBody,
  EnableEjectResponse,
  ListClientsQuery,
  ListClientsResponse,
  PortalRequestOptions
} from './types/index.js';

export const custodianOperations = {
  createClient: { method: 'POST', path: '/custodians/me/clients' },
  listClients: { method: 'GET', path: '/custodians/me/clients' },
  getClient: { method: 'GET', path: '/custodians/me/clients/{clientId}' },
  createClientSession: { method: 'POST', path: '/custodians/me/clients/{clientId}/sessions' },
  buildTransaction: {
    method: 'POST',
    path: '/custodians/me/clients/{clientId}/chains/{chain}/assets/send/build-transaction'
  },
  enableEject: { method: 'PATCH', path: '/custodians/me/clients/{clientId}/enable-eject' },
  getEjectableBackupShares: {
    method: 'GET',
    path: '/custodians/me/clients/{clientId}/wallets/{walletId}/ejectable-backup-shares'
  }
} as const;

export type CustodianOperation = keyof typeof custodianOperations;

export type CustodianRequestOptions = RequestOptions;

/**
 * Custodian-scoped Portal operations (`/custodians/me/...`).
 *
 * Every call is authenticated with the Portal custodian token, which the SDK
 * resolves from your Tatum `x-api-key` — you never pass it yourself. Use this
 * to manage Portal clients, mint session tokens, and run the eject flow.
 */
export class CustodianApi {
  constructor(
    private readonly provider: PortalTatumProvider,
    private readonly config: WalletsSDKConfig
  ) {}

  /**
   * Escape hatch: dispatch any custodian operation by name with raw options.
   * Prefer the typed methods below; use this only for not-yet-modeled behavior.
   */
  async request<TResponse = unknown>(
    operationName: CustodianOperation,
    options: CustodianRequestOptions = {}
  ): Promise<TResponse> {
    const operation = custodianOperations[operationName];
    const token = await this.provider.getCustodianToken();
    const client = createPortalApiClient(this.config, token, PORTAL_API_BASE_URL);

    return client.request<TResponse>(buildRequestOptions(operation.method, operation.path, options));
  }

  /**
   * Register a new Portal client. Returns its `id`, `clientApiKey`, and an
   * initial `clientSessionToken` — pass either to {@link TatumWalletsSdk.initClient}.
   */
  createClient<TResponse = CreateClientResponse>(
    options?: PortalRequestOptions<CreateClientBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('createClient', options);
  }

  /** List the custodian's Portal clients, with cursor-based pagination (`take` ≤ 100). */
  listClients<TResponse = ListClientsResponse>(
    options?: PortalRequestOptions<never, never, ListClientsQuery>
  ): Promise<TResponse> {
    return this.request<TResponse>('listClients', options);
  }

  /** Fetch a single client's details — wallets, addresses, and share-pair statuses. */
  getClient<TResponse = ClientDetails>(
    options: PortalRequestOptions<never, { clientId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('getClient', options);
  }

  /** Mint a fresh Client Session Token (CST) for the given client. */
  createClientSession<TResponse = CreateClientSessionResponse>(
    options: PortalRequestOptions<CreateClientSessionBody, { clientId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('createClientSession', options);
  }

  /**
   * Build an unsigned asset-transfer transaction for a client on the given chain.
   * The caller signs and submits it separately (e.g. via {@link WalletsClient.sign}).
   */
  buildTransaction<TResponse = BuildTransactionResponse>(
    options: PortalRequestOptions<BuildTransactionBody, { clientId: string; chain: WalletChain }>
  ): Promise<TResponse> {
    return this.request<TResponse>('buildTransaction', options);
  }

  /**
   * Enable key eject for a client's wallet until `ejectableUntil`, allowing the
   * client to later reconstruct its full private key off Portal.
   */
  enableEject<TResponse = EnableEjectResponse>(
    options: PortalRequestOptions<EnableEjectBody, { clientId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('enableEject', options);
  }

  /**
   * Fetch a wallet's ejectable backup shares — the client's encrypted backup
   * share (if stored with Portal) plus the custodian backup share.
   */
  getEjectableBackupShares<TResponse = EjectableBackupShares>(
    options: PortalRequestOptions<never, { clientId: string; walletId: string }>
  ): Promise<TResponse> {
    return this.request<TResponse>('getEjectableBackupShares', options);
  }
}
