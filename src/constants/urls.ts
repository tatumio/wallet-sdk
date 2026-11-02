/** Tatum API base URL (default; overridable via `config.baseUrl`). */
export const TATUM_API_BASE_URL = 'https://api.tatum.io';

/** REST API base (custodian- and client-scoped endpoints). */
export const PORTAL_API_BASE_URL = 'https://api.portalhq.io/api/v3';

/** Enclave MPC API base (generate/backup/recover/sign/sendAssets). */
export const PORTAL_ENCLAVE_BASE_URL = 'https://mpc-client.portalhq.io';

/** Portal managed RPC gateway base (`/{namespace}/{reference}`). */
export const PORTAL_RPC_GATEWAY_BASE_URL = 'https://api.portalhq.io/rpc/v1';
