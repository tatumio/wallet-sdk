import type { Curve } from './portal/types/shared.js';

/**
 * Supported wallet chains.
 *
 * Each enum value is the chain's CAIP-2 identifier, so a `WalletChain`
 * can be passed directly anywhere the API expects a `chainId` or `chain`
 * (sign, evaluate-transaction, sendAssets, build-transaction).
 */
export enum WalletChain {
  MONAD_MAINNET = 'eip155:143',
  ETHEREUM_MAINNET = 'eip155:1',
  ETHEREUM_SEPOLIA = 'eip155:11155111',
  SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  STELLAR_MAINNET = 'stellar:pubnet',
  TRON_MAINNET = 'tron:mainnet',
  BITCOIN_MAINNET = 'bip122:000000000019d6689c085ae165831e93-p2wpkh',
  ARBITRUM_MAINNET = 'eip155:42161',
  AVALANCHE_MAINNET = 'eip155:43114',
  BASE_MAINNET = 'eip155:8453',
  OPTIMISM_MAINNET = 'eip155:10',
  POLYGON_MAINNET = 'eip155:137',
  CELO_MAINNET = 'eip155:42220'
}

export interface WalletChainConfig {
  /** CAIP-2 chain identifier (identical to the {@link WalletChain} value). */
  chainId: WalletChain;
  /** Signing curve this chain uses — picks which `shares[curve]` to pass to sign/sendAssets. */
  curve: Curve;
  /**
   * Whether the API hard-requires an explicit `rpcUrl` server-side (no managed
   * default node). Informational: the SDK always expects callers to pass
   * `rpcUrl` on `sign`/`sendAssets` regardless.
   */
  requiresRpcUrl: boolean;
  /** Tatum network slug — used for Tatum custodian proxy paths and `<slug>.gateway.tatum.io` RPC URLs. */
  tatumNetwork: string;
}

/** Per-chain configuration, keyed by {@link WalletChain}. */
export const WALLET_CHAINS: Record<WalletChain, WalletChainConfig> = {
  [WalletChain.MONAD_MAINNET]: {
    chainId: WalletChain.MONAD_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'monad-mainnet'
  },
  [WalletChain.ETHEREUM_MAINNET]: {
    chainId: WalletChain.ETHEREUM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'ethereum-mainnet'
  },
  [WalletChain.ETHEREUM_SEPOLIA]: {
    chainId: WalletChain.ETHEREUM_SEPOLIA,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'ethereum-sepolia'
  },
  [WalletChain.SOLANA_MAINNET]: {
    chainId: WalletChain.SOLANA_MAINNET,
    curve: 'ED25519',
    requiresRpcUrl: false,
    tatumNetwork: 'solana-mainnet'
  },
  [WalletChain.STELLAR_MAINNET]: {
    chainId: WalletChain.STELLAR_MAINNET,
    curve: 'ED25519',
    requiresRpcUrl: true,
    tatumNetwork: 'stellar-mainnet'
  },
  [WalletChain.TRON_MAINNET]: {
    chainId: WalletChain.TRON_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'tron-mainnet'
  },
  [WalletChain.BITCOIN_MAINNET]: {
    chainId: WalletChain.BITCOIN_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'bitcoin-mainnet'
  },
  [WalletChain.ARBITRUM_MAINNET]: {
    chainId: WalletChain.ARBITRUM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'arb-one-mainnet'
  },
  [WalletChain.AVALANCHE_MAINNET]: {
    chainId: WalletChain.AVALANCHE_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'avax-mainnet'
  },
  [WalletChain.BASE_MAINNET]: {
    chainId: WalletChain.BASE_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'base-mainnet'
  },
  [WalletChain.OPTIMISM_MAINNET]: {
    chainId: WalletChain.OPTIMISM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'optimism-mainnet'
  },
  [WalletChain.POLYGON_MAINNET]: {
    chainId: WalletChain.POLYGON_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'polygon-mainnet'
  },
  [WalletChain.CELO_MAINNET]: {
    chainId: WalletChain.CELO_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'celo-mainnet'
  }
};

/** Resolve the configuration for a supported chain. */
export function getWalletChainConfig(chain: WalletChain): WalletChainConfig {
  return WALLET_CHAINS[chain];
}
