import type { RequestOptions } from '../../types.js';

/**
 * Per-operation options for typed Portal methods. Narrows the shared
 * RequestOptions: when a type param is `never` the field is forbidden, otherwise
 * required (Query defaults to forbidden). `headers` and `signal` stay available.
 */
export type PortalRequestOptions<Body = never, Path = never, Query = never> =
  Omit<RequestOptions, 'body' | 'path' | 'query'>
  & ([Body] extends [never] ? { body?: never } : { body: Body })
  & ([Path] extends [never] ? { path?: never } : { path: Path })
  & ([Query] extends [never] ? { query?: never } : { query: Query });

// ── shared sub-types ────────────────────────────────────────────────
export interface WalletShare {
  share: string;
  id: string;
}

/** Curve-keyed shares returned by generate/backup/recover. */
export interface CurveShares {
  SECP256K1: WalletShare;
  ED25519: WalletShare;
}

export type Curve = 'SECP256K1' | 'ED25519';

export interface BackupSharePair {
  backupMethod?: 'CUSTOM' | 'GDRIVE' | 'ICLOUD' | 'PASSWORD' | 'PASSKEY' | 'UNKNOWN';
  createdAt?: string;
  id?: string;
  status?:
    | 'completed'
    | 'incomplete'
    | 'STORED_CLIENT_BACKUP_SHARE'
    | 'STORED_CLIENT_BACKUP_SHARE_KEY'
    | 'STORED_CUSTODIAN_BACKUP_SHARE'
    | 'UNKNOWN';
}

export interface SigningSharePair {
  createdAt?: string;
  id?: string;
  status?: 'completed' | 'incomplete' | 'STORED_DATABASE' | 'STORED_CLIENT';
}

export interface Wallet {
  createdAt?: string;
  curve?: Curve;
  id?: string;
  ejectableUntil?: string | null;
  publicKey?: string | null;
  backupSharePairs?: BackupSharePair[];
  signingSharePairs?: SigningSharePair[];
}

/** Full client object (GET client / list results). All fields optional per spec. */
export interface ClientDetails {
  createdAt?: string;
  custodian?: { id?: string; name?: string };
  ejectedAt?: string | null;
  environment?: {
    id?: string;
    name?: string;
    backupWithPortalEnabled?: boolean;
    isMultiBackupEnabled?: boolean;
  };
  id?: string;
  isAccountAbstracted?: boolean;
  metadata?: {
    namespaces?: Record<string, { address?: string; curve?: Curve }>;
  };
  wallets?: Wallet[];
}

export interface EjectableBackupShares {
  encryptedClientBackupShare?: string | null;
  custodianBackupShare?: string;
}

// ── build-transaction (shared by custodian + client scopes) ─────────
// Response union has no discriminator; narrow by shape.
export interface Eip155TransactionResult {
  transaction?: { from?: string; to?: string; data?: string; value?: string };
  metadata?: {
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    tokenAddress?: string;
    tokenDecimals?: number;
    tokenSymbol?: string;
    rawAmount?: string;
  };
}

export interface SolanaTransactionResult {
  transaction?: string;
  metadata?: {
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    tokenMintAddress?: string;
    tokenDecimals?: number;
    tokenProgramId?: string;
    tokenExtensions?: string[];
    tokenSymbol?: string;
    rawAmount?: string;
    lastValidBlockHeight?: string;
    serializedTransactionBase64Encoded?: string;
    serializedTransactionBase58Encoded?: string;
  };
}

export interface BitcoinTransactionResult {
  transaction?: { publicKey?: string; rawTxHex?: string; signatureHashes?: string[] };
  metadata?: {
    chainId?: string;
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    rawAmount?: string;
    tokenDecimals?: number;
    tokenSymbol?: string;
    feeInSatoshis?: string;
    changeInSatoshis?: string;
  };
}

export interface StellarTransactionResult {
  transaction?: { xdr?: string; networkPassphrase?: string };
  metadata?: {
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    assetCode?: string;
    assetIssuer?: string | null;
    rawAmount?: string;
  };
}

export interface TronTransactionResult {
  transaction?: { id?: string; network?: 'mainnet' | 'nile' | 'shasta' };
  metadata?: {
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    tokenSymbol?: string;
    contractAddress?: string | null;
  };
}

export type BuildTransactionResponse =
  | Eip155TransactionResult
  | SolanaTransactionResult
  | BitcoinTransactionResult
  | StellarTransactionResult
  | TronTransactionResult;

export interface BuildTransactionBody {
  to: string;
  token: string;
  amount: string;
}
