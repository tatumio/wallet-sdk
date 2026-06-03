import type { ClientDetails } from './shared.js';

// ── custodian (api.portalhq.io/api/v3, /custodians/me/...) ───────────
export interface CreateClientBody {
  isAccountAbstracted?: boolean;
}
export interface CreateClientResponse {
  id?: string;
  clientApiKey?: string;
  clientSessionToken?: string;
  isAccountAbstracted?: boolean;
}

/** Body for minting a Client Session Token (CST). */
export interface CreateClientSessionBody {
  isAccountAbstracted?: boolean;
}
export interface CreateClientSessionResponse {
  id?: string;
  clientSessionToken?: string;
  isAccountAbstracted?: boolean;
}

// `type` (not `interface`) so it is assignable to QueryParams (Record<string, ...>).
export type ListClientsQuery = {
  cursor?: string;
  take?: number; // default 100, max 100
};
export interface ListClientsResponse {
  results?: ClientDetails[];
  metadata?: { cursor?: string | null; take?: number; total?: number };
}

export interface EnableEjectBody {
  walletId: string;
  ejectableUntil?: string; // date-time, >= 1 min from now
}
export interface EnableEjectResponse {
  ejectableUntil?: string;
}
