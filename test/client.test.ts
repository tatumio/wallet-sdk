import { describe, expect, it } from 'vitest';
import {
  CustodianApi,
  TatumWalletsSdk,
  WalletsApiClient,
  WalletsApiError,
  WalletsClient,
  extractErrorDetail
} from '../src/index.js';

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...Object.fromEntries(new Headers(init?.headers).entries())
    }
  });

describe('WalletsApiClient', () => {
  it('sends JSON requests with base URL, API key, query params, and custom headers', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({ id: 'wallet-1' });
    };
    const client = new WalletsApiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.test/v1/',
      fetch: fetchImpl
    });

    const result = await client.request<{ id: string }>({
      method: 'POST',
      path: '/wallets',
      query: { chain: 'ethereum', empty: undefined },
      body: { label: 'Treasury' },
      headers: { 'x-request-id': 'request-1' }
    });

    expect(result).toEqual({ id: 'wallet-1' });
    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.input)).toBe('https://api.example.test/v1/wallets?chain=ethereum');
    expect(calls[0]?.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ label: 'Treasury' })
    });
    expect(calls[0]?.init?.headers).toMatchObject({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-key': 'test-api-key',
      'x-request-id': 'request-1'
    });
  });

  it('returns undefined for empty successful responses', async () => {
    const client = new WalletsApiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.test',
      fetch: async () => new Response(null, { status: 204 })
    });

    await expect(client.request({ method: 'DELETE', path: '/wallets/wallet-1' })).resolves.toBeUndefined();
  });

  it('throws WalletsApiError with status and parsed response body', async () => {
    const client = new WalletsApiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.test',
      fetch: async () => jsonResponse({ message: 'Invalid wallet' }, { status: 400 })
    });

    await expect(client.request({ method: 'GET', path: '/wallets/missing' })).rejects.toMatchObject({
      name: 'WalletsApiError',
      status: 400,
      body: { message: 'Invalid wallet' }
    });
  });

  it('does not force a JSON content type for FormData bodies', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const client = new WalletsApiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.test',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ jobId: 'job-1' });
      }
    });
    const formData = new FormData();
    formData.set('file', new Blob(['hello']), 'hello.txt');

    await client.request({ method: 'POST', path: '/storage', body: formData });

    expect(calls[0]?.init?.body).toBe(formData);
    expect(calls[0]?.init?.headers).not.toMatchObject({ 'content-type': 'application/json' });
  });
});

describe('TatumWalletsSdk', () => {
  it('constructs without an API key but requires one for custodian / api operations', () => {
    const sdk = new TatumWalletsSdk({ fetch: async () => jsonResponse({ ok: true }) });

    // Client-side operations need only a client token — no Tatum apiKey.
    expect(sdk.initClient({ token: 'portal-client-token' })).toBeInstanceOf(WalletsClient);

    // Custodian / raw api are backend-only and throw without an apiKey.
    expect(() => sdk.custodian).toThrow('apiKey is required');
    expect(() => sdk.api).toThrow('apiKey is required');
  });

  it('exposes a generic API wrapper, custodian API, and client initializer', async () => {
    const sdk = new TatumWalletsSdk({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.test',
      fetch: async () => jsonResponse({ ok: true })
    });

    expect(sdk).toBeInstanceOf(TatumWalletsSdk);
    expect(sdk.custodian).toBeInstanceOf(CustodianApi);
    expect(sdk.initClient({ token: 'portal-client-token' })).toBeInstanceOf(WalletsClient);
    await expect(sdk.api.get<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true });
  });

  it('exports WalletsApiError for instanceof checks', () => {
    const error = new WalletsApiError('Request failed', {
      status: 500,
      body: 'server error'
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WalletsApiError);
  });

  it('folds the upstream error detail into the message across layers', () => {
    // Enclave MPC: { id, message }
    expect(
      new WalletsApiError('MPC API request failed with status 422', {
        status: 422,
        body: { id: 'RPC_OP_FAILED', message: 'Failed to send transaction: nonce too low' }
      }).message
    ).toBe('MPC API request failed with status 422: Failed to send transaction: nonce too low');

    // Enclave MPC with a code but no message: falls back to the id.
    expect(
      new WalletsApiError('MPC API request failed with status 400', {
        status: 400,
        body: { id: 'BAD_REQUEST' }
      }).message
    ).toBe('MPC API request failed with status 400: BAD_REQUEST');

    // Client / custodian REST: { error }
    expect(
      new WalletsApiError('Wallets API request failed with status 404', {
        status: 404,
        body: { error: 'Client not found' }
      }).message
    ).toBe('Wallets API request failed with status 404: Client not found');

    // simulate-transaction: { requestError: { message } }
    expect(
      new WalletsApiError('Wallets API request failed with status 400', {
        status: 400,
        body: { requestError: { message: 'insufficient funds' } }
      }).message
    ).toBe('Wallets API request failed with status 400: insufficient funds');

    // Plain-text body (e.g. enclave 401).
    expect(
      new WalletsApiError('MPC API request failed with status 401', {
        status: 401,
        body: 'Incorrect API key format'
      }).message
    ).toBe('MPC API request failed with status 401: Incorrect API key format');

    // No usable detail: message is left untouched, body still accessible.
    const bare = new WalletsApiError('Wallets API request failed with status 500', {
      status: 500,
      body: undefined
    });
    expect(bare.message).toBe('Wallets API request failed with status 500');
    expect(bare.body).toBeUndefined();
  });

  it('extractErrorDetail reads each layer envelope and ignores empties', () => {
    expect(extractErrorDetail({ id: 'X', message: 'boom' })).toBe('boom');
    expect(extractErrorDetail({ id: 'DKG_FAILED' })).toBe('DKG_FAILED');
    expect(extractErrorDetail({ error: 'nope' })).toBe('nope');
    expect(extractErrorDetail({ requestError: { message: 'bad' } })).toBe('bad');
    expect(extractErrorDetail('  text  ')).toBe('text');
    expect(extractErrorDetail('')).toBeUndefined();
    expect(extractErrorDetail({})).toBeUndefined();
    expect(extractErrorDetail(null)).toBeUndefined();
    expect(extractErrorDetail(undefined)).toBeUndefined();
  });
});
