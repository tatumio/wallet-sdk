import type { ApiErrorOptions } from './types.js';

/**
 * Error body shapes returned across the wallet API layers. The envelope is not
 * uniform, so the field carrying the human-readable detail differs by layer:
 * - Enclave MPC API: `{ id, message? }` (`id` is a short code, e.g. `RPC_OP_FAILED`).
 * - Client / custodian REST: `{ error }`.
 * - `simulate-transaction`: `{ requestError: { message } }`.
 * - Some responses (e.g. enclave 401) are plain text.
 *
 * Runtime bodies may not match any of these (network proxies, non-JSON), so
 * {@link WalletsApiError.body} stays `unknown` — use this union to narrow.
 */
export type PortalErrorBody =
  | { id: string; message?: string }
  | { error: string }
  | { requestError?: { message?: string } }
  | string;

/**
 * Pull the most human-readable message out of an error body, regardless of
 * which layer's envelope it uses. Returns `undefined` when nothing usable is
 * present (so the caller can fall back to a generic message).
 */
export function extractErrorDetail(body: unknown): string | undefined {
  if (typeof body === 'string') {
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (body !== null && typeof body === 'object') {
    const record = body as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message) {
      return record.message; // enclave MPC ({ id, message })
    }
    if (typeof record.error === 'string' && record.error) {
      return record.error; // client / custodian REST ({ error })
    }

    const requestError = record.requestError;
    if (
      requestError !== null &&
      typeof requestError === 'object' &&
      typeof (requestError as Record<string, unknown>).message === 'string' &&
      (requestError as { message: string }).message
    ) {
      return (requestError as { message: string }).message; // simulate-transaction
    }

    if (typeof record.id === 'string' && record.id) {
      return record.id; // enclave error with a code but no message
    }
  }

  return undefined;
}

export class WalletsApiError extends Error {
  readonly status: number;
  readonly statusText: string | undefined;
  readonly body: unknown;
  readonly headers: Headers | undefined;

  constructor(message: string, options: ApiErrorOptions) {
    const detail = extractErrorDetail(options.body);
    super(detail ? `${message}: ${detail}` : message);
    this.name = 'WalletsApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.body = options.body;
    this.headers = options.headers;
  }
}
