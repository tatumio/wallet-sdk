import { WALLET_CHAINS } from '../chains.js';
import { CUSTODIAN_API_KEY_PATH, TATUM_RPC_GATEWAY_DOMAIN } from '../constants/index.js';
import type { WalletChain } from '../chains.js';
import type { WalletsApiClient } from './api-client.js';
import type { WalletsSDKConfig } from '../types.js';

/** Response of {@link CUSTODIAN_API_KEY_PATH} (custodian-api-key-response.dto). */
interface CustodianApiKeyResponse {
  portalCustodianApiKey?: string;
}

export class PortalTatumProvider {
  private custodianTokenPromise: Promise<string> | undefined;

  constructor(
    private readonly tatumClient: WalletsApiClient,
    private readonly config: WalletsSDKConfig
  ) {}

  getCustodianToken(): Promise<string> {
    // The custodian key is stable for the SDK's lifetime, so resolve it once.
    // Reset on failure so a transient error doesn't permanently poison the SDK.
    this.custodianTokenPromise ??= this.fetchCustodianToken().catch((error: unknown) => {
      this.custodianTokenPromise = undefined;
      throw error;
    });

    return this.custodianTokenPromise;
  }

  private async fetchCustodianToken(): Promise<string> {
    const response = await this.tatumClient.get<CustodianApiKeyResponse>(CUSTODIAN_API_KEY_PATH);
    const token = response?.portalCustodianApiKey;

    if (!token) {
      throw new Error(
        `Tatum API key is not authorized for Portal: ${CUSTODIAN_API_KEY_PATH} returned no portalCustodianApiKey`
      );
    }

    return token;
  }

  /**
   * Resolve the Tatum RPC gateway URL for a supported chain, in the form
   * `https://<network>.gateway.tatum.io/<apiKey>`. `chain` is the Portal
   * CAIP-2 id (the {@link WalletChain} value). Throws for unsupported chains.
   */
  async getRpcUrl(chain: string): Promise<string> {
    const network = WALLET_CHAINS[chain as WalletChain]?.tatumRpcNetwork;

    if (!network) {
      throw new Error(`No Tatum RPC gateway configured for chain "${chain}"`);
    }

    return `https://${network}.${TATUM_RPC_GATEWAY_DOMAIN}/${this.config.apiKey}`;
  }
}
