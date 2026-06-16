import { getWalletChainConfig } from '../chains.js';
import { buildRequestOptions } from '../operation.js';
import type { WalletChain } from '../chains.js';
import type { WalletsApiClient } from '../tatum/api-client.js';
import type { RequestOptions } from '../types.js';
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
  GasSponsorshipChain,
  GetGasSponsorshipChainsQuery,
  ListClientsQuery,
  ListClientsResponse,
  PortalRequestOptions,
  UpdateGasSponsorshipBody
} from './types/index.js';

/** Custodian operations, proxied by Tatum under `/v4/wallets` (Tatum injects the Portal token). */
export const custodianOperations = {
  createClient: { method: 'POST', path: '/v4/wallets/clients' },
  listClients: { method: 'GET', path: '/v4/wallets/clients' },
  getClient: { method: 'GET', path: '/v4/wallets/clients/{clientId}' },
  createClientSession: { method: 'POST', path: '/v4/wallets/clients/{clientId}/sessions' },
  buildTransaction: {
    method: 'POST',
    path: '/v4/wallets/clients/{clientId}/chains/{chain}/assets/send/build-transaction'
  },
  enableEject: { method: 'PATCH', path: '/v4/wallets/clients/{clientId}/enable-eject' },
  getEjectableBackupShares: {
    method: 'GET',
    path: '/v4/wallets/clients/{clientId}/wallets/{walletId}/ejectable-backup-shares'
  },
  getGasSponsorshipChains: { method: 'GET', path: '/v4/wallets/gas-sponsorship/chains' },
  updateGasSponsorship: { method: 'PATCH', path: '/v4/wallets/gas-sponsorship/chains/{chain}' }
} as const;

export type CustodianOperation = keyof typeof custodianOperations;

export type CustodianRequestOptions = RequestOptions;

/** Map a public CAIP-2 {@link WalletChain} to the Tatum network slug used in proxy paths/queries. */
const toTatumNetwork = (chain: WalletChain): string => getWalletChainConfig(chain).tatumNetwork;

/**
 * Custodian-scoped operations, served through the Tatum Wallets proxy
 * (`/v4/wallets/...`). Authenticated with your Tatum `x-api-key`; Tatum resolves
 * the custodian token server-side, so you never handle it. Use this to manage
 * clients, mint sessions, build transactions, run the eject flow, and configure
 * gas sponsorship.
 */
export class CustodianApi {
  constructor(private readonly tatumClient: WalletsApiClient) {}

  /**
   * Escape hatch: dispatch any custodian operation by name with raw options.
   * Prefer the typed methods below; use this only for not-yet-modeled behavior.
   */
  // `async` so a synchronous failure (e.g. a missing path param from
  // `buildRequestOptions`) surfaces as a rejected promise, not a sync throw.
  async request<TResponse = unknown>(
    operationName: CustodianOperation,
    options: CustodianRequestOptions = {}
  ): Promise<TResponse> {
    const operation = custodianOperations[operationName];

    return this.tatumClient.request<TResponse>(
      buildRequestOptions(operation.method, operation.path, options)
    );
  }

  /**
   * Register a new client. Returns its `id`, `clientApiKey`, and an initial
   * `clientSessionToken` — pass either to {@link TatumWalletsSdk.initClient}.
   */
  createClient<TResponse = CreateClientResponse>(
    options?: PortalRequestOptions<CreateClientBody>
  ): Promise<TResponse> {
    return this.request<TResponse>('createClient', options);
  }

  /** List the custodian's clients, with cursor-based pagination (`take` ≤ 100). */
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
    return this.request<TResponse>('buildTransaction', {
      ...options,
      path: { clientId: options.path.clientId, chain: toTatumNetwork(options.path.chain) }
    });
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

  /**
   * List gas-sponsorship configuration per chain. Optionally filter by `chains`
   * (mapped to Tatum network slugs).
   */
  getGasSponsorshipChains<TResponse = GasSponsorshipChain[]>(
    options?: PortalRequestOptions<never, never, GetGasSponsorshipChainsQuery>
  ): Promise<TResponse> {
    const requestOptions: CustodianRequestOptions = {};
    const chains = options?.query?.chains;

    if (chains && chains.length > 0) {
      requestOptions.query = { chains: chains.map(toTatumNetwork).join(',') };
    }
    if (options?.headers !== undefined) {
      requestOptions.headers = options.headers;
    }
    if (options?.signal !== undefined) {
      requestOptions.signal = options.signal;
    }

    return this.request<TResponse>('getGasSponsorshipChains', requestOptions);
  }

  /** Update the gas-allowance limit for a chain's sponsorship. */
  updateGasSponsorship<TResponse = GasSponsorshipChain>(
    options: PortalRequestOptions<UpdateGasSponsorshipBody, { chain: WalletChain }>
  ): Promise<TResponse> {
    return this.request<TResponse>('updateGasSponsorship', {
      ...options,
      path: { chain: toTatumNetwork(options.path.chain) }
    });
  }
}
