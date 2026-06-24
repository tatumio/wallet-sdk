import { ClientApi } from './client-api.js';
import { EnclaveApi } from './enclave-api.js';
import { reconstructPrivateKey } from '../eject/index.js';
import type { ReconstructPrivateKeyParams } from '../eject/index.js';
import type { ClientOperation } from './client-api.js';
import type { EnclaveOperation } from './enclave-api.js';
import type { Curve } from './types/index.js';
import type { WalletChain } from '../chains.js';
import type { RequestOptions, WalletsSDKConfig } from '../types.js';
import type {
  BackupShareCipherTextResponse,
  BackupWalletBody,
  BackupWalletResponse,
  BuildTransactionBody,
  BuildTransactionResponse,
  ClientDetails,
  ClientEjectableBackupSharesQuery,
  ClientEjectableBackupSharesResponse,
  EvaluateTransactionBody,
  EvaluateTransactionQuery,
  EvaluateTransactionResponse,
  GenerateWalletResponse,
  PortalRequestOptions,
  RawSignBody,
  RawSignResponse,
  RecoverWalletBody,
  RecoverWalletResponse,
  SendAssetsBody,
  SendAssetsResponse,
  SignBody,
  SignResponse,
  StoreBackupShareBody,
  UpdateBackupSharePairsBody,
  UpdateSigningSharePairsBody
} from './types/index.js';

export interface InitClientConfig {
  token: string;
}

export type WalletsClientRequestOptions = RequestOptions;

/**
 * Client-scoped operations for a single client.
 *
 * Obtain via {@link TatumWalletsSdk.initClient}. Calls authenticate with the
 * client's API key / Client Session Token. It is a thin facade over two
 * internal layers — the client REST API ({@link ClientApi}, `/clients/me/...`)
 * and the Enclave MPC API ({@link EnclaveApi}, wallet generation/signing/sending/
 * backup/recovery, which operate on key shares).
 */
export class WalletsClient {
  private readonly clientApi: ClientApi;
  private readonly enclaveApi: EnclaveApi;

  constructor(clientConfig: InitClientConfig, sdkConfig: WalletsSDKConfig) {
    if (!clientConfig.token) {
      throw new Error('Client token is required');
    }

    this.clientApi = new ClientApi(clientConfig.token, sdkConfig);
    this.enclaveApi = new EnclaveApi(clientConfig.token, sdkConfig);
  }

  /**
   * Escape hatch: dispatch any client REST operation by name with raw options.
   * Prefer the typed methods; use this only for not-yet-modeled behavior.
   */
  request<TResponse = unknown>(
    operationName: ClientOperation,
    options: WalletsClientRequestOptions = {}
  ): Promise<TResponse> {
    return this.clientApi.request<TResponse>(operationName, options);
  }

  /**
   * Escape hatch: dispatch any Enclave MPC operation by name. Chain operations
   * (`sign`/`sendAssets`) require an `rpcUrl` in the body. Prefer the typed
   * enclave methods below.
   */
  enclaveRequest<TResponse = unknown>(
    operationName: EnclaveOperation,
    options: WalletsClientRequestOptions = {}
  ): Promise<TResponse> {
    return this.enclaveApi.request<TResponse>(operationName, options);
  }

  // ── client REST layer ──────────────────────────────────────────────

  /** Fetch this client's details — wallets, addresses, and share-pair statuses. */
  getClientDetails<TResponse = ClientDetails>(options?: PortalRequestOptions): Promise<TResponse> {
    return this.clientApi.getClientDetails<TResponse>(options);
  }

  /**
   * Build an unsigned asset-transfer transaction on the given chain. Sign and
   * submit it separately via {@link sign} (or {@link sendAssets} to do both).
   */
  buildTransaction<TResponse = BuildTransactionResponse>(
    options: PortalRequestOptions<BuildTransactionBody, { chain: WalletChain }>
  ): Promise<TResponse> {
    return this.clientApi.buildTransaction<TResponse>(options);
  }

  /** Simulate and/or validate a transaction before signing (balance changes, risk score). */
  evaluateTransaction<TResponse = EvaluateTransactionResponse>(
    options: PortalRequestOptions<EvaluateTransactionBody, never, EvaluateTransactionQuery>
  ): Promise<TResponse> {
    return this.clientApi.evaluateTransaction<TResponse>(options);
  }

  /** Confirm the client has stored its signing shares by updating their pair statuses. */
  updateSigningSharePairs<TResponse = void>(
    options: PortalRequestOptions<UpdateSigningSharePairsBody>
  ): Promise<TResponse> {
    return this.clientApi.updateSigningSharePairs<TResponse>(options);
  }

  /**
   * Mark backup share pairs stored — the final step of a backup, after
   * {@link storeEncryptedBackupShare} (managed backup) or storing on your own backend.
   */
  updateBackupSharePairs<TResponse = void>(
    options: PortalRequestOptions<UpdateBackupSharePairsBody>
  ): Promise<TResponse> {
    return this.clientApi.updateBackupSharePairs<TResponse>(options);
  }

  /**
   * Store a client-encrypted backup share against its pair (managed
   * backups). Call once per curve with that curve's ciphertext, then mark the
   * pairs stored via {@link updateBackupSharePairs}.
   */
  storeEncryptedBackupShare<TResponse = void>(
    options: PortalRequestOptions<StoreBackupShareBody, { backupSharePairId: string }>
  ): Promise<TResponse> {
    return this.clientApi.storeEncryptedBackupShare<TResponse>(options);
  }

  /** Retrieve a previously stored client-encrypted backup share ciphertext. */
  getBackupShareCipherText<TResponse = BackupShareCipherTextResponse>(
    options: PortalRequestOptions<never, { backupSharePairId: string }>
  ): Promise<TResponse> {
    return this.clientApi.getBackupShareCipherText<TResponse>(options);
  }

  /** Fetch this wallet's ejectable backup shares for the given backup method. */
  getEjectableBackupShares<TResponse = ClientEjectableBackupSharesResponse>(
    options: PortalRequestOptions<never, { walletId: string }, ClientEjectableBackupSharesQuery>
  ): Promise<TResponse> {
    return this.clientApi.getEjectableBackupShares<TResponse>(options);
  }

  /** Finalize an eject for a wallet after the client has reconstructed its key. */
  completeEject<TResponse = void>(
    options: PortalRequestOptions<never, { walletId: string }>
  ): Promise<TResponse> {
    return this.clientApi.completeEject<TResponse>(options);
  }

  /**
   * Reconstruct this wallet's full private key from its ejectable backup shares.
   * Pure and network-free: decrypt `encryptedClientBackupShare` yourself first,
   * then pass it with the `custodianBackupShare` from {@link getEjectableBackupShares}.
   * Returns hex (SECP256K1) or Base58 (ED25519).
   */
  reconstructPrivateKey(params: ReconstructPrivateKeyParams): Promise<string> {
    return reconstructPrivateKey(params);
  }

  // ── enclave MPC layer ──────────────────────────────────────────────

  /**
   * Generate a new MPC wallet (Enclave API), producing one signing share per
   * curve (`SECP256K1` and `ED25519`). Returns the shares to store client-side.
   */
  generateWallet<TResponse = GenerateWalletResponse>(options?: PortalRequestOptions): Promise<TResponse> {
    return this.enclaveApi.generateWallet<TResponse>(options);
  }

  /**
   * Produce backup shares from the generate response (Enclave API). Encrypt and
   * persist them, then call {@link updateBackupSharePairs} to complete the backup.
   */
  backupWallet<TResponse = BackupWalletResponse>(
    options: PortalRequestOptions<BackupWalletBody>
  ): Promise<TResponse> {
    return this.enclaveApi.backupWallet<TResponse>(options);
  }

  /** Reconstruct signing shares from a (decrypted) backup response (Enclave API). */
  recoverWallet<TResponse = RecoverWalletResponse>(
    options: PortalRequestOptions<RecoverWalletBody>
  ): Promise<TResponse> {
    return this.enclaveApi.recoverWallet<TResponse>(options);
  }

  /**
   * Sign (and, for transaction methods, submit) via the Enclave API using the
   * given RPC `method` — e.g. `eth_sendTransaction`, `personal_sign`,
   * `sol_signTransaction`, `stellar_sendTransaction`, `tron_sendTransaction`.
   */
  sign<TResponse = SignResponse>(options: PortalRequestOptions<SignBody>): Promise<TResponse> {
    return this.enclaveApi.sign<TResponse>(options);
  }

  /**
   * Raw-sign a hex digest with the given curve. No chain/RPC context — the
   * digest is signed directly (SECP256K1 for EVM, ED25519 for Solana, etc.).
   */
  rawSign<TResponse = RawSignResponse>(
    options: PortalRequestOptions<RawSignBody, { curve: Curve }>
  ): Promise<TResponse> {
    return this.enclaveApi.rawSign<TResponse>(options);
  }

  /**
   * Build, sign, and broadcast an asset transfer in one call (Enclave API).
   * Requires an `rpcUrl` in the body (your own node or a Tatum gateway URL).
   */
  sendAssets<TResponse = SendAssetsResponse>(
    options: PortalRequestOptions<SendAssetsBody>
  ): Promise<TResponse> {
    return this.enclaveApi.sendAssets<TResponse>(options);
  }
}
