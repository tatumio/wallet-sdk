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
  SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  STELLAR_MAINNET = 'stellar:pubnet',
  TRON_MAINNET = 'tron:mainnet',
  TRON_NILE = 'tron:nile',
  BITCOIN_MAINNET = 'bip122:000000000019d6689c085ae165831e93-p2wpkh',
  BITCOIN_TESTNET = 'bip122:000000000933ea01ad0ee984209779ba-p2wpkh',
  ARBITRUM_MAINNET = 'eip155:42161',
  ARBITRUM_SEPOLIA = 'eip155:421614',
  AVALANCHE_MAINNET = 'eip155:43114',
  BASE_MAINNET = 'eip155:8453',
  BASE_SEPOLIA = 'eip155:84532',
  OPTIMISM_MAINNET = 'eip155:10',
  OPTIMISM_SEPOLIA = 'eip155:11155420',
  POLYGON_MAINNET = 'eip155:137',
  POLYGON_AMOY = 'eip155:80002',
  CELO_MAINNET = 'eip155:42220',
  BSC_MAINNET = 'eip155:56',
  BSC_TESTNET = 'eip155:97',
  ARBITRUM_NOVA_MAINNET = 'eip155:42170',
  AVALANCHE_FUJI = 'eip155:43113',
  MONAD_TESTNET = 'eip155:10143',
  GNOSIS_MAINNET = 'eip155:100',
  GNOSIS_CHIADO = 'eip155:10200',
  FANTOM_MAINNET = 'eip155:250',
  ROOTSTOCK_MAINNET = 'eip155:30',
  ROOTSTOCK_TESTNET = 'eip155:31',
  ZKSYNC_MAINNET = 'eip155:324',
  ZKSYNC_SEPOLIA = 'eip155:300',
  CHILIZ_MAINNET = 'eip155:88888',
  CHILIZ_TESTNET = 'eip155:88882',
  CRONOS_MAINNET = 'eip155:25',
  RONIN_MAINNET = 'eip155:2020',
  LISK_MAINNET = 'eip155:1135',
  /**
   * Litecoin. Portal's registry key uses a 31-character genesis hash and no
   * `-p2wpkh` suffix (unlike its Bitcoin ids), so it is not a well-formed CAIP-2
   * string. Kept verbatim — it is the value Portal's API matches on.
   */
  LITECOIN_MAINNET = 'bip122:12a765e31ffd4059bada1e25190f6e9',
  STELLAR_TESTNET = 'stellar:testnet',
  TRON_SHASTA = 'tron:shasta',
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
    tatumNetwork: 'monad-mainnet',
  },
  [WalletChain.ETHEREUM_MAINNET]: {
    chainId: WalletChain.ETHEREUM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'ethereum-mainnet',
  },
  [WalletChain.ETHEREUM_SEPOLIA]: {
    chainId: WalletChain.ETHEREUM_SEPOLIA,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'ethereum-sepolia',
  },
  [WalletChain.SOLANA_MAINNET]: {
    chainId: WalletChain.SOLANA_MAINNET,
    curve: 'ED25519',
    requiresRpcUrl: false,
    tatumNetwork: 'solana-mainnet',
  },
  [WalletChain.SOLANA_DEVNET]: {
    chainId: WalletChain.SOLANA_DEVNET,
    curve: 'ED25519',
    requiresRpcUrl: false,
    tatumNetwork: 'solana-devnet',
  },
  [WalletChain.STELLAR_MAINNET]: {
    chainId: WalletChain.STELLAR_MAINNET,
    curve: 'ED25519',
    requiresRpcUrl: true,
    tatumNetwork: 'stellar-mainnet',
  },
  [WalletChain.TRON_MAINNET]: {
    chainId: WalletChain.TRON_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'tron-mainnet',
  },
  [WalletChain.TRON_NILE]: {
    chainId: WalletChain.TRON_NILE,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'tron-nile',
  },
  [WalletChain.BITCOIN_MAINNET]: {
    chainId: WalletChain.BITCOIN_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'bitcoin-mainnet',
  },
  [WalletChain.BITCOIN_TESTNET]: {
    chainId: WalletChain.BITCOIN_TESTNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'bitcoin-testnet',
  },
  [WalletChain.ARBITRUM_MAINNET]: {
    chainId: WalletChain.ARBITRUM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'arb-one-mainnet',
  },
  [WalletChain.ARBITRUM_SEPOLIA]: {
    chainId: WalletChain.ARBITRUM_SEPOLIA,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'arbitrum-one-sepolia',
  },
  [WalletChain.AVALANCHE_MAINNET]: {
    chainId: WalletChain.AVALANCHE_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'avax-mainnet',
  },
  [WalletChain.BASE_MAINNET]: {
    chainId: WalletChain.BASE_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'base-mainnet',
  },
  [WalletChain.BASE_SEPOLIA]: {
    chainId: WalletChain.BASE_SEPOLIA,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'base-sepolia',
  },
  [WalletChain.OPTIMISM_MAINNET]: {
    chainId: WalletChain.OPTIMISM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'optimism-mainnet',
  },
  [WalletChain.OPTIMISM_SEPOLIA]: {
    chainId: WalletChain.OPTIMISM_SEPOLIA,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'optimism-testnet',
  },
  [WalletChain.POLYGON_MAINNET]: {
    chainId: WalletChain.POLYGON_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'polygon-mainnet',
  },
  [WalletChain.POLYGON_AMOY]: {
    chainId: WalletChain.POLYGON_AMOY,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'polygon-amoy',
  },
  [WalletChain.CELO_MAINNET]: {
    chainId: WalletChain.CELO_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'celo-mainnet',
  },
  [WalletChain.BSC_MAINNET]: {
    chainId: WalletChain.BSC_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'bsc-mainnet',
  },
  [WalletChain.BSC_TESTNET]: {
    chainId: WalletChain.BSC_TESTNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'bsc-testnet',
  },
  [WalletChain.ARBITRUM_NOVA_MAINNET]: {
    chainId: WalletChain.ARBITRUM_NOVA_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'arbitrum-nova-mainnet',
  },
  [WalletChain.AVALANCHE_FUJI]: {
    chainId: WalletChain.AVALANCHE_FUJI,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'avalanche-testnet',
  },
  [WalletChain.MONAD_TESTNET]: {
    chainId: WalletChain.MONAD_TESTNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'monad-testnet',
  },
  [WalletChain.GNOSIS_MAINNET]: {
    chainId: WalletChain.GNOSIS_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'gnosis-mainnet',
  },
  [WalletChain.GNOSIS_CHIADO]: {
    chainId: WalletChain.GNOSIS_CHIADO,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'gnosis-testnet',
  },
  [WalletChain.FANTOM_MAINNET]: {
    chainId: WalletChain.FANTOM_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'fantom-mainnet',
  },
  [WalletChain.ROOTSTOCK_MAINNET]: {
    chainId: WalletChain.ROOTSTOCK_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'rootstock-mainnet',
  },
  [WalletChain.ROOTSTOCK_TESTNET]: {
    chainId: WalletChain.ROOTSTOCK_TESTNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'rootstock-testnet',
  },
  [WalletChain.ZKSYNC_MAINNET]: {
    chainId: WalletChain.ZKSYNC_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'zksync-mainnet',
  },
  [WalletChain.ZKSYNC_SEPOLIA]: {
    chainId: WalletChain.ZKSYNC_SEPOLIA,
    curve: 'SECP256K1',
    requiresRpcUrl: false,
    tatumNetwork: 'zksync-sepolia',
  },
  [WalletChain.CHILIZ_MAINNET]: {
    chainId: WalletChain.CHILIZ_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'chiliz-mainnet',
  },
  [WalletChain.CHILIZ_TESTNET]: {
    chainId: WalletChain.CHILIZ_TESTNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'chiliz-testnet',
  },
  [WalletChain.CRONOS_MAINNET]: {
    chainId: WalletChain.CRONOS_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'cronos-mainnet',
  },
  [WalletChain.RONIN_MAINNET]: {
    chainId: WalletChain.RONIN_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'ronin-mainnet',
  },
  [WalletChain.LISK_MAINNET]: {
    chainId: WalletChain.LISK_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'lisk-mainnet',
  },
  [WalletChain.LITECOIN_MAINNET]: {
    chainId: WalletChain.LITECOIN_MAINNET,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'litecoin-mainnet',
  },
  [WalletChain.STELLAR_TESTNET]: {
    chainId: WalletChain.STELLAR_TESTNET,
    curve: 'ED25519',
    requiresRpcUrl: true,
    tatumNetwork: 'stellar-testnet',
  },
  [WalletChain.TRON_SHASTA]: {
    chainId: WalletChain.TRON_SHASTA,
    curve: 'SECP256K1',
    requiresRpcUrl: true,
    tatumNetwork: 'tron-shasta',
  },
};

/** Resolve the configuration for a supported chain. */
export function getWalletChainConfig(chain: WalletChain): WalletChainConfig {
  return WALLET_CHAINS[chain];
}
