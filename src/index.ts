export { WALLET_CHAINS, WalletChain, getWalletChainConfig } from './chains.js';
export { WalletsApiError } from './errors.js';
export { CustodianApi, custodianOperations } from './portal/custodian.js';
export { clientOperations } from './portal/client-api.js';
export { enclaveOperations } from './portal/enclave-api.js';
export { WalletsClient } from './portal/wallets-client.js';
export { reconstructPrivateKey } from './eject/index.js';
export { TatumWalletsSdk } from './sdk.js';
export { WalletsApiClient } from './tatum/api-client.js';
export type { WalletChainConfig } from './chains.js';
export type { CustodianOperation, CustodianRequestOptions } from './portal/custodian.js';
export type { ClientOperation } from './portal/client-api.js';
export type { EnclaveOperation } from './portal/enclave-api.js';
export type { InitClientConfig, WalletsClientRequestOptions } from './portal/wallets-client.js';
export type { ReconstructPrivateKeyParams, ShareInput } from './eject/index.js';
export type { PathParamValue } from './path.js';
export type {
  ApiErrorOptions,
  ApiRequestOptions,
  HttpMethod,
  QueryParams,
  QueryValue,
  WalletsSDKConfig
} from './types.js';
export type {
  BackupShareCipherTextResponse,
  BackupSharePair,
  BackupWalletBody,
  BackupWalletResponse,
  BitcoinTransactionResult,
  BuildTransactionBody,
  BuildTransactionResponse,
  ClientDetails,
  ClientEjectableBackupSharesQuery,
  ClientEjectableBackupSharesResponse,
  CreateClientBody,
  CreateClientResponse,
  CreateClientSessionBody,
  CreateClientSessionResponse,
  Curve,
  CurveShares,
  Eip155TransactionResult,
  EjectableBackupShares,
  EjectableBackupSharesBackupMethod,
  EnableEjectBody,
  EnableEjectResponse,
  EvaluateTransactionBody,
  EvaluateTransactionEvmBody,
  EvaluateTransactionOperationType,
  EvaluateTransactionQuery,
  EvaluateTransactionResponse,
  EvaluateTransactionSimulation,
  EvaluateTransactionSolanaBody,
  EvaluateTransactionValidation,
  GenerateWalletResponse,
  ListClientsQuery,
  ListClientsResponse,
  PortalRequestOptions,
  RawSignBody,
  RawSignResponse,
  RecoverWalletBody,
  RecoverWalletResponse,
  SendAssetsBody,
  SendAssetsResponse,
  SignBody,
  SignResponse,
  SigningSharePair,
  StoreBackupShareBody,
  SolanaTransactionResult,
  StellarTransactionResult,
  TronTransactionResult,
  UpdateBackupSharePairsBody,
  UpdateSigningSharePairsBody,
  Wallet,
  WalletShare
} from './portal/types/index.js';
