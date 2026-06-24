import { CustodianApi } from './portal/custodian.js';
import { WalletsClient } from './portal/wallets-client.js';
import { WalletsApiClient } from './tatum/api-client.js';
import type { InitClientConfig } from './portal/wallets-client.js';
import type { WalletsSDKConfig } from './types.js';

/**
 * Entry point for the Tatum-hosted MPC wallet SDK.
 *
 * Two scopes, two auth models:
 * - {@link custodian} and {@link api} are **backend-only** — they require a
 *   Tatum `apiKey` (`x-api-key`) and throw if one was not configured. Use them
 *   to provision clients, mint sessions, and configure gas sponsorship.
 * - {@link initClient} is **client-side** — it authenticates with a single
 *   client token (API key or Client Session Token) and needs **no Tatum
 *   `apiKey`**, so it is safe to run in a browser/mobile bundle.
 *
 * @example
 * // Backend: provision a client with your Tatum API key.
 * const wallets = new TatumWalletsSdk({ apiKey: process.env.TATUM_API_KEY! });
 * const newClient = await wallets.custodian.createClient({ body: { isAccountAbstracted: false } });
 *
 * @example
 * // Client-side: act on behalf of a single client — no apiKey needed.
 * const wallets = new TatumWalletsSdk();
 * const client = wallets.initClient({ token: clientSessionToken });
 */
export class TatumWalletsSdk {
  private _api?: WalletsApiClient;
  private _custodian?: CustodianApi;

  constructor(private readonly config: WalletsSDKConfig = {}) {}

  /**
   * Low-level Tatum API client (`x-api-key` auth). Escape hatch for raw,
   * not-yet-modeled Tatum calls. Requires a Tatum `apiKey` — throws if absent.
   */
  get api(): WalletsApiClient {
    this._api ??= new WalletsApiClient(this.config);
    return this._api;
  }

  /**
   * Custodian-scoped operations, authenticated with your Tatum
   * `x-api-key`. Backend only — requires a Tatum `apiKey` and throws if absent.
   */
  get custodian(): CustodianApi {
    this._custodian ??= new CustodianApi(this.api);
    return this._custodian;
  }

  /**
   * Create a client-scoped API for a single client. Needs no Tatum
   * `apiKey` — authenticates with the client's own token.
   *
   * @param config - Holds the client's API key or Client Session Token (CST).
   * @returns A {@link WalletsClient} bound to that token.
   */
  initClient(config: InitClientConfig): WalletsClient {
    return new WalletsClient(config, this.config);
  }
}
