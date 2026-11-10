import { END_OF_LIFE_CHAINS, WalletChain } from '../chains.js';
import { PORTAL_ENCLAVE_BASE_URL, PORTAL_RPC_GATEWAY_BASE_URL } from '../constants/index.js';
import { WalletChainEndOfLifeError } from '../errors.js';
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
 * Portal broadcasts Tron over gRPC and rejects other HTTP(S) RPC URLs, so Tron
 * `sign`/`sendAssets` always go through Portal's own gateway, whatever `rpcUrl`
 * the caller passed.
 */
const TRON_RPC_GATEWAYS: Readonly<Record<string, string>> = {
  [WalletChain.TRON_MAINNET]: `${PORTAL_RPC_GATEWAY_BASE_URL}/tron/mainnet`,
  [WalletChain.TRON_NILE]: `${PORTAL_RPC_GATEWAY_BASE_URL}/tron/nile`,
  [WalletChain.TRON_SHASTA]: `${PORTAL_RPC_GATEWAY_BASE_URL}/tron/shasta`
};

const CHAIN_FIELD: Partial<Record<EnclaveOperation, string>> = {
  sign: 'chainId',
  sendAssets: 'chain'
};

/** The chain a `sign`/`sendAssets` request targets; `undefined` for other operations. */
function targetChain(operationName: EnclaveOperation, options: RequestOptions): string | undefined {
  const chainField = CHAIN_FIELD[operationName];
  const body = options.body;
  if (chainField === undefined || typeof body !== 'object' || body === null) {
    return undefined;
  }

  const chain = (body as Record<string, unknown>)[chainField];
  return typeof chain === 'string' ? chain : undefined;
}

function withTronRpcGateway(chain: string | undefined, options: RequestOptions): RequestOptions {
  const gateway = chain === undefined ? undefined : TRON_RPC_GATEWAYS[chain];
  if (gateway === undefined) {
    return options;
  }

  return { ...options, body: { ...(options.body as object), rpcUrl: gateway } };
}

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
    const chain = targetChain(operationName, options);
    const endOfLife = chain === undefined ? undefined : END_OF_LIFE_CHAINS[chain];
    if (chain !== undefined && endOfLife !== undefined) {
      return Promise.reject(new WalletChainEndOfLifeError(chain, endOfLife));
    }

    const client = createPortalApiClient(this.sdkConfig, this.token, PORTAL_ENCLAVE_BASE_URL);

    return client.request<TResponse>(
      buildRequestOptions(operation.method, operation.path, withTronRpcGateway(chain, options))
    );
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
