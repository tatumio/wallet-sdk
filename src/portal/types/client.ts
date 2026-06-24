import type { WalletChain } from '../../chains.js';
import type { EjectableBackupShares } from './shared.js';

// ── evaluate-transaction (simulate / validate) ──────────────────────
// Which checks to run. Defaults to 'all' server-side.
export type EvaluateTransactionOperationType = 'validation' | 'simulation' | 'all';

/** EVM (EIP-155) transaction fields. Mirrors the JSON-RPC tx object. */
export interface EvaluateTransactionEvmBody {
  /** Target contract or recipient address. */
  to: string;
  /** Encoded calldata (hex). */
  data?: string;
  /** Native value in wei (hex). */
  value?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  operationType?: EvaluateTransactionOperationType;
}

/** Solana transaction(s) to evaluate. */
export interface EvaluateTransactionSolanaBody {
  /** Base58-encoded Solana transactions. */
  transactions: string[];
  operationType?: EvaluateTransactionOperationType;
}

/** oneOf: EVM tx fields or a Solana `transactions` array, selected by `chainId`. */
export type EvaluateTransactionBody = EvaluateTransactionEvmBody | EvaluateTransactionSolanaBody;

// `type` (not `interface`) so it is assignable to QueryParams (Record<string, ...>).
export type EvaluateTransactionQuery = {
  /** CAIP-2 chain id, e.g. `eip155:1`. */
  chainId: WalletChain;
};

/** Static validation result (present when `operationType` includes validation). */
export interface EvaluateTransactionValidation {
  status?: string;
  resultType?: string;
  description?: string;
  reason?: string;
  classification?: string;
  features?: unknown[];
}

/** Simulation result (present when `operationType` includes simulation). */
export interface EvaluateTransactionSimulation {
  status?: string;
  assetsDiffs?: unknown[];
  totalUsdDiff?: unknown;
  exposures?: unknown[];
  totalUsdExposure?: unknown;
  addressDetails?: unknown;
  accountSummary?: unknown;
}

export interface EvaluateTransactionResponse {
  /** CAIP-2 chain id the evaluation ran against. */
  chain: string;
  validation?: EvaluateTransactionValidation;
  simulation?: EvaluateTransactionSimulation;
}

// ── client-scoped share-pair + eject (/clients/me/...) ──
export interface UpdateSigningSharePairsBody {
  signingSharePairIds: string[];
  status: 'STORED_CLIENT';
}
export interface UpdateBackupSharePairsBody {
  backupSharePairIds: string[];
  status: 'STORED_CLIENT_BACKUP_SHARE' | 'STORED_CLIENT_BACKUP_SHARE_KEY';
}

/**
 * Body for storing a single client-encrypted backup share against its pair.
 * Sent once per curve (SECP256K1, ED25519) as part of the managed-backup
 * flow. Endpoint returns 204 No Content.
 */
export interface StoreBackupShareBody {
  /** Ciphertext produced by encrypting the curve's backup share. */
  clientCipherText: string;
}

/** Response of GET .../backup-share-pairs/{id}/cipher-text. */
export interface BackupShareCipherTextResponse {
  cipherText: string;
}

export type EjectableBackupSharesBackupMethod = 'GDRIVE' | 'ICLOUD' | 'PASSWORD' | 'PASSKEY';
// `type` (not `interface`) so it is assignable to QueryParams (Record<string, ...>).
export type ClientEjectableBackupSharesQuery = {
  backupMethod: EjectableBackupSharesBackupMethod;
};
export interface ClientEjectableBackupSharesResponse {
  data?: EjectableBackupShares;
}
