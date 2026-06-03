import { CustodianApi } from './portal/custodian.js';
import { WalletsClient } from './portal/wallets-client.js';
import { WalletsApiClient } from './tatum/api-client.js';
import { PortalTatumProvider } from './tatum/provider.js';
import type { InitClientConfig } from './portal/wallets-client.js';
import type { WalletsSDKConfig } from './types.js';

/**
 * Entry point for the Tatum-hosted Portal wallet SDK.
 *
 * Construct once with your Tatum API key, then use {@link custodian} for
 * custodian-scoped operations (client management, sessions, eject) and
 * {@link initClient} to act on behalf of a single Portal client (wallet
 * generation, signing, sending, backup/recovery).
 *
 * @example
 * const wallets = new TatumWalletsSdk({ apiKey: process.env.TATUM_API_KEY! });
 * const portalClient = await wallets.custodian.createClient({ body: { isAccountAbstracted: false } });
 * const client = wallets.initClient({ token: portalClient.clientApiKey! });
 */
export class TatumWalletsSdk {
  /** Low-level Tatum API client (`x-api-key` auth). Escape hatch for raw, not-yet-modeled Tatum calls. */
  readonly api: WalletsApiClient;
  /** Custodian-scoped Portal operations, authenticated with your Tatum-resolved custodian token. */
  readonly custodian: CustodianApi;
  private readonly portalProvider: PortalTatumProvider;

  constructor(private readonly config: WalletsSDKConfig) {
    this.api = new WalletsApiClient(config);
    this.portalProvider = new PortalTatumProvider(this.api, config);
    this.custodian = new CustodianApi(this.portalProvider, config);
  }

  /**
   * Create a client-scoped API for a single Portal client.
   *
   * @param config - Holds the client's Portal API key or Client Session Token (CST).
   * @returns A {@link WalletsClient} bound to that token.
   */
  initClient(config: InitClientConfig): WalletsClient {
    return new WalletsClient(config, this.portalProvider, this.config);
  }
}
