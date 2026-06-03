import type { WalletChain } from '../../chains.js';
import type { EjectableBackupShares } from './shared.js';

// ── evaluate-transaction (simulate / validate) ──────────────────────
export interface EvaluateTransactionToken {
  address: string;
  decimals: number;
  symbol: string;
}
export interface EvaluateTransactionInput {
  toAddress: string;
  /** Native amount in base units (wei for EVM, lamports for Solana). */
  value: string;
  /** Calldata for contract interactions. */
  data?: string;
  /** Present when interacting with a token rather than the native asset. */
  token?: EvaluateTransactionToken;
}
export type EvaluateTransactionOperationType = 'validation' | 'simulation' | 'all';
export interface EvaluateTransactionBody {
  /** Network name, e.g. 'ethereum', 'solana'. */
  network: string;
  transaction: EvaluateTransactionInput;
  /** Defaults to 'all' server-side. */
  operationType?: EvaluateTransactionOperationType;
}
// `type` (not `interface`) so it is assignable to QueryParams (Record<string, ...>).
export type EvaluateTransactionQuery = {
  chainId: WalletChain;
};
export interface TransactionBalanceChange {
  token?: EvaluateTransactionToken;
  amount?: string;
  type?: 'IN' | 'OUT';
}
export interface TransactionEvaluation {
  balanceChanges?: TransactionBalanceChange[];
  riskScore?: number;
  classification?: string;
}
/** Shape varies by chain; EVM returns `evaluation`, Bitcoin returns `unsignedTx`. */
export interface EvaluateTransactionResponse {
  evaluation?: TransactionEvaluation;
  unsignedTx?: { data?: string; recentBlockhash?: string };
}

// ── client-scoped share-pair + eject (api.portalhq.io/api/v3, /clients/me/...) ──
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
 * Sent once per curve (SECP256K1, ED25519) as part of the Portal-Managed
 * backup flow. Endpoint returns 204 No Content.
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
