/** Tatum endpoint that resolves the caller's Portal custodian API key from their `x-api-key`. */
export const CUSTODIAN_API_KEY_PATH = '/v4/wallets/custodian-api-key';

/** Tatum usage-metering endpoint hit once per wallet generation. */
export const USAGE_WALLET_PATH = '/v4/wallets/usage/wallet';

/** Tatum usage-metering endpoint hit once per signing operation (sign/rawSign/sendAssets). */
export const USAGE_TRANSACTION_PATH = '/v4/wallets/usage/transaction';
