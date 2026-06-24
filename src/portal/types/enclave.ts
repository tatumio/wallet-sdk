import type { WalletChain } from "../../chains.js";
import type { CurveShares } from "./shared.js";

// ── enclave (MPC API) ───────────────────────────────────────────────
export type GenerateWalletResponse = CurveShares;

export interface BackupWalletBody {
  /** JSON-stringified /v1/generate response. */
  generateResponse: string;
}
export type BackupWalletResponse = CurveShares;

export interface RecoverWalletBody {
  /** JSON-stringified /v1/backup response. */
  backupResponse: string;
}
export type RecoverWalletResponse = CurveShares;

export interface SignBody {
  method: string; // RPC method, e.g. 'eth_sendTransaction', 'personal_sign'
  params: object | unknown[]; // method-dependent; spec does not enumerate
  share: string;
  chainId: WalletChain;
  to: string;
  rpcUrl: string; // node provider RPC URL
  metadataStr?: string;
  sponsorGas?: boolean; // default true
  presignature?: string; // mutually exclusive with presignatureId
  presignatureId?: string;
}
export interface SignResponse {
  data: string;
}

/**
 * Body for raw-signing a hex digest with a specific curve
 * (POST /v1/raw/sign/{curve}). No chain/RPC context — signs the digest directly.
 */
export interface RawSignBody {
  /** Hex string of the digest to sign, without a leading `0x`. */
  params: string;
  /** MPC share for the requested curve. */
  share: string;
}
export interface RawSignResponse {
  data: string;
}

export interface SendAssetsBody {
  share: string;
  chain: WalletChain;
  to: string;
  token: string; // contract/mint address or 'NATIVE' / 'USDC' / ...
  amount: string;
  rpcUrl: string; // node provider RPC URL
  nonce?: string;
  metadataStr?: string;
  sponsorGas?: boolean; // default true
  presignature?: string;
  presignatureId?: string;
}
export interface SendAssetsResponse {
  transactionHash: string;
  metadata: {
    amount: string;
    rawAmount: string;
    tokenAddress: string;
    tokenDecimals: number;
  };
}
