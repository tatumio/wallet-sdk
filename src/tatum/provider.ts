import { WALLET_CHAINS } from '../chains.js';
import {
  TATUM_RPC_GATEWAY_DOMAIN,
  USAGE_TRANSACTION_PATH,
  USAGE_WALLET_PATH
} from '../constants/index.js';
import type { WalletChain } from '../chains.js';
import type { WalletsApiClient } from './api-client.js';
import type { WalletsSDKConfig } from '../types.js';

export class PortalTatumProvider {
  constructor(
    private readonly tatumClient: WalletsApiClient,
    private readonly config: WalletsSDKConfig
  ) {}

  /**
   * Report a wallet generation to Tatum's usage meter. Best-effort: authenticated
   * with the client's Portal token (bearer) on top of the SDK's `x-api-key`, and
   * any failure is swallowed so metering never breaks the underlying operation.
   */
  trackWalletCreation(clientToken: string): Promise<void> {
    return this.meterUsage(USAGE_WALLET_PATH, clientToken);
  }

  /**
   * Report a signing operation (sign/rawSign/sendAssets) to Tatum's usage meter.
   * Best-effort — see {@link trackWalletCreation}.
   */
  trackTransaction(clientToken: string): Promise<void> {
    return this.meterUsage(USAGE_TRANSACTION_PATH, clientToken);
  }

  private async meterUsage(path: string, clientToken: string): Promise<void> {
    try {
      await this.tatumClient.post(path, {}, { headers: { authorization: `Bearer ${clientToken}` } });
    } catch {
      // Best-effort metering: a metering failure must never surface to the caller.
    }
  }

  /**
   * Resolve the Tatum RPC gateway URL for a supported chain, in the form
   * `https://<network>.gateway.tatum.io/<apiKey>`. `chain` is the Portal
   * CAIP-2 id (the {@link WalletChain} value). Throws for unsupported chains.
   */
  async getRpcUrl(chain: string): Promise<string> {
    const network = WALLET_CHAINS[chain as WalletChain]?.tatumNetwork;

    if (!network) {
      throw new Error(`No Tatum RPC gateway configured for chain "${chain}"`);
    }

    return `https://${network}.${TATUM_RPC_GATEWAY_DOMAIN}/${this.config.apiKey}`;
  }
}
