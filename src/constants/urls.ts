/** Tatum API base URL (default; overridable via `config.baseUrl`). */
export const TATUM_API_BASE_URL = 'https://api.tatum.io';

/** Portal REST API base (custodian- and client-scoped endpoints). */
export const PORTAL_API_BASE_URL = 'https://api.portalhq.io/api/v3';

/** Portal Enclave MPC API base (generate/backup/recover/sign/sendAssets). */
export const PORTAL_ENCLAVE_BASE_URL = 'https://mpc-client.portalhq.io';

/**
 * Tatum RPC gateway domain. Per-chain RPC URLs are built as
 * `https://<network>.${TATUM_RPC_GATEWAY_DOMAIN}/<apiKey>` (the `<network>`
 * slug comes from each chain's {@link WalletChainConfig.tatumNetwork}).
 */
export const TATUM_RPC_GATEWAY_DOMAIN = 'gateway.tatum.io';
