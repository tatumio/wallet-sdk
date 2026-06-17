import { describe, expect, expectTypeOf, it } from 'vitest';
import { WALLET_CHAINS, TatumWalletsSdk, WalletChain, getWalletChainConfig } from '../src/index.js';
import type {
  BuildTransactionResponse,
  ClientDetails,
  ClientEjectableBackupSharesResponse,
  CreateClientResponse,
  EjectableBackupShares,
  EnableEjectResponse,
  GenerateWalletResponse,
  ListClientsResponse,
  SendAssetsResponse,
  SignResponse
} from '../src/portal/types/index.js';

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...Object.fromEntries(new Headers(init?.headers).entries())
    }
  });

describe('Portal-backed Tatum Wallets SDK', () => {
  it('encodes custodian path parameters', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      baseUrl: 'https://api.tatum.test',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ id: 'client-1' });
      }
    });

    await sdk.custodian.getClient({
      path: { clientId: 'client/with space' }
    });

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.input)).toBe(
      'https://api.tatum.test/v4/wallets/clients/client%2Fwith%20space'
    );
  });

  it('sends custodian requests through the Tatum proxy with x-api-key (no bearer)', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ results: [] });
      }
    });

    await sdk.custodian.listClients();

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.input)).toBe('https://api.tatum.io/v4/wallets/clients');
    expect(calls[0]?.init).toMatchObject({ method: 'GET' });
    expect(calls[0]?.init?.headers).toMatchObject({
      accept: 'application/json',
      'x-api-key': 'tatum-api-key'
    });
    expect((calls[0]?.init?.headers as Record<string, string>)?.authorization).toBeUndefined();
  });

  it('injects a Tatum-resolved RPC URL for client sendAssets when omitted', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ transactionHash: '0xhash' });
      }
    });

    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.sendAssets({
      body: {
        share: 'share',
        chain: WalletChain.ETHEREUM_MAINNET,
        to: '0xabc',
        token: 'NATIVE',
        amount: '0.01'
      }
    });

    expect(String(calls[0]?.input)).toBe('https://mpc-client.portalhq.io/v1/assets/send');
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        share: 'share',
        chain: 'eip155:1',
        to: '0xabc',
        token: 'NATIVE',
        amount: '0.01',
        rpcUrl: 'https://ethereum-mainnet.gateway.tatum.io/tatum-api-key'
      })
    );
  });

  it('throws when resolving an RPC URL for an unsupported chain', async () => {
    const sdk = new TatumWalletsSdk({ apiKey: 'tatum-api-key', fetch: async () => jsonResponse({}) });
    const client = sdk.initClient({ token: 'portal-client-token' });

    // Escape hatch with an unmapped chain — no gateway slug exists for it.
    await expect(
      client.enclaveRequest('sendAssets', {
        body: { share: 's', chain: 'eip155:999999', to: '0xabc', token: 'NATIVE', amount: '0.01' }
      })
    ).rejects.toThrow('No Tatum RPC gateway configured for chain "eip155:999999"');
  });

  it('creates and lists Portal clients through the Tatum-backed custodian', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ id: 'client-1', clientApiKey: 'client-key', clientSessionToken: 'session-token' });
      }
    });

    await sdk.custodian.createClient({ body: { isAccountAbstracted: false } });
    await sdk.custodian.listClients({ query: { take: 10, cursor: 'client-0' } });

    const [createCall, listCall] = calls;
    expect(String(createCall?.input)).toBe('https://api.tatum.io/v4/wallets/clients');
    expect(createCall?.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ isAccountAbstracted: false })
    });
    expect(createCall?.init?.headers).toMatchObject({ 'x-api-key': 'tatum-api-key' });
    expect(String(listCall?.input)).toBe(
      'https://api.tatum.io/v4/wallets/clients?take=10&cursor=client-0'
    );
    expect(listCall?.init).toMatchObject({ method: 'GET' });
  });

  it('rejects for missing custodian path parameters', async () => {
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async () => jsonResponse({ ok: true })
    });

    // Cast to bypass the now-required typed path so the runtime guard is exercised.
    await expect(
      sdk.custodian.getClient({ path: {} as { clientId: string } })
    ).rejects.toThrow('Missing path parameter "clientId"');
  });

  it('uses the selected client token for client-scoped API calls', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ id: 'client-1' });
      }
    });

    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.getClientDetails();

    expect(String(calls[0]?.input)).toBe('https://api.portalhq.io/api/v3/clients/me');
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: 'Bearer portal-client-token'
    });
  });

  it('uses the Enclave MPC base URL for wallet generation and backup', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({
          SECP256K1: { share: 'share-1', id: 'id-1' },
          ED25519: { share: 'share-2', id: 'id-2' }
        });
      }
    });

    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.generateWallet();
    await client.backupWallet({ body: { generateResponse: '{"ok":true}' } });

    expect(String(calls[0]?.input)).toBe('https://mpc-client.portalhq.io/v1/generate');
    expect(calls[0]?.init).toMatchObject({ method: 'POST', body: JSON.stringify({}) });
    // generateWallet meters wallet-creation usage against Tatum before returning.
    expect(String(calls[1]?.input)).toBe('https://api.tatum.io/v4/wallets/usage/wallet');
    expect(calls[1]?.init?.headers).toMatchObject({
      'x-api-key': 'tatum-api-key',
      authorization: 'Bearer portal-client-token'
    });
    expect(String(calls[2]?.input)).toBe('https://mpc-client.portalhq.io/v1/backup');
    expect(calls[2]?.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ generateResponse: '{"ok":true}' })
    });
  });

  it('supports custodian transaction and ejection operations', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true });
      }
    });

    await sdk.custodian.buildTransaction({
      path: { clientId: 'client-1', chain: WalletChain.ETHEREUM_MAINNET },
      body: { to: '0xabc', token: 'USDC', amount: '0.01' }
    });
    await sdk.custodian.enableEject({
      path: { clientId: 'client-1' },
      body: { walletId: 'wallet-1', ejectableUntil: '2026-06-01T00:00:00.000Z' }
    });
    await sdk.custodian.getEjectableBackupShares({
      path: { clientId: 'client-1', walletId: 'wallet-1' }
    });

    const [buildCall, ejectCall, sharesCall] = calls;
    // The CAIP-2 WalletChain is mapped to the Tatum network slug in the path.
    expect(String(buildCall?.input)).toBe(
      'https://api.tatum.io/v4/wallets/clients/client-1/chains/ethereum-mainnet/assets/send/build-transaction'
    );
    expect(String(ejectCall?.input)).toBe(
      'https://api.tatum.io/v4/wallets/clients/client-1/enable-eject'
    );
    expect(String(sharesCall?.input)).toBe(
      'https://api.tatum.io/v4/wallets/clients/client-1/wallets/wallet-1/ejectable-backup-shares'
    );
  });

  it('lists and updates gas sponsorship with Tatum network slugs', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse([]);
      }
    });

    await sdk.custodian.getGasSponsorshipChains({
      query: { chains: [WalletChain.ETHEREUM_MAINNET, WalletChain.ARBITRUM_MAINNET] }
    });
    await sdk.custodian.updateGasSponsorship({
      path: { chain: WalletChain.SOLANA_MAINNET },
      body: { value: '0.5' }
    });

    const listUrl = new URL(String(calls[0]?.input));
    expect(listUrl.pathname).toBe('/v4/wallets/gas-sponsorship/chains');
    expect(listUrl.searchParams.get('chains')).toBe('ethereum-mainnet,arb-one-mainnet');
    expect(calls[0]?.init?.headers).toMatchObject({ 'x-api-key': 'tatum-api-key' });

    expect(String(calls[1]?.input)).toBe(
      'https://api.tatum.io/v4/wallets/gas-sponsorship/chains/solana-mainnet'
    );
    expect(calls[1]?.init).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ value: '0.5' });
  });

  it('supports client wallet-share operations', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true });
      }
    });
    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.updateSigningSharePairs({
      body: { signingSharePairIds: ['ssp-1'], status: 'STORED_CLIENT' }
    });
    await client.updateBackupSharePairs({
      body: { backupSharePairIds: ['bsp-1'], status: 'STORED_CLIENT_BACKUP_SHARE' }
    });
    await client.getEjectableBackupShares({
      path: { walletId: 'wallet-1' },
      query: { backupMethod: 'PASSWORD' }
    });
    await client.completeEject({
      path: { walletId: 'wallet-1' }
    });

    expect(String(calls[0]?.input)).toBe('https://api.portalhq.io/api/v3/clients/me/signing-share-pairs');
    expect(String(calls[1]?.input)).toBe('https://api.portalhq.io/api/v3/clients/me/backup-share-pairs');
    expect(String(calls[2]?.input)).toBe(
      'https://api.portalhq.io/api/v3/clients/me/wallets/wallet-1/ejectable-backup-shares?backupMethod=PASSWORD'
    );
    expect(String(calls[3]?.input)).toBe('https://api.portalhq.io/api/v3/clients/me/wallets/wallet-1/complete-eject');
  });

  it('evaluates a transaction with a CAIP-2 chainId query', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ evaluation: { riskScore: 0.2, classification: 'LOW_RISK' } });
      }
    });
    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.evaluateTransaction({
      query: { chainId: WalletChain.ETHEREUM_MAINNET },
      body: {
        network: 'ethereum',
        transaction: { toAddress: '0xabc', value: '10000000000000000' }
      }
    });

    expect(String(calls[0]?.input)).toBe(
      'https://api.portalhq.io/api/v3/clients/me/evaluate-transaction?chainId=eip155%3A1'
    );
    expect(calls[0]?.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        network: 'ethereum',
        transaction: { toAddress: '0xabc', value: '10000000000000000' }
      })
    });
    expect(calls[0]?.init?.headers).toMatchObject({ authorization: 'Bearer portal-client-token' });
  });

  it('mints a client session token through the custodian', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ id: 'client-1', clientSessionToken: 'cst-1', isAccountAbstracted: false });
      }
    });

    await sdk.custodian.createClientSession({
      path: { clientId: 'client-1' },
      body: { isAccountAbstracted: false }
    });

    const [sessionCall] = calls;
    expect(String(sessionCall?.input)).toBe(
      'https://api.tatum.io/v4/wallets/clients/client-1/sessions'
    );
    expect(sessionCall?.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ isAccountAbstracted: false })
    });
    expect(sessionCall?.init?.headers).toMatchObject({
      'x-api-key': 'tatum-api-key'
    });
  });

  it('stores and reads client-encrypted backup shares (Portal-Managed flow)', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ cipherText: '0351cf2b' });
      }
    });
    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.storeEncryptedBackupShare({
      path: { backupSharePairId: 'bsp 1' },
      body: { clientCipherText: 'cipher' }
    });
    await client.getBackupShareCipherText({ path: { backupSharePairId: 'bsp-1' } });

    expect(String(calls[0]?.input)).toBe('https://api.portalhq.io/api/v3/clients/me/backup-share-pairs/bsp%201');
    expect(calls[0]?.init).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ clientCipherText: 'cipher' })
    });
    expect(String(calls[1]?.input)).toBe(
      'https://api.portalhq.io/api/v3/clients/me/backup-share-pairs/bsp-1/cipher-text'
    );
    expect(calls[1]?.init).toMatchObject({ method: 'GET' });
  });

  it('raw-signs a hex digest by curve on the Enclave base URL', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ data: '0xsig' });
      }
    });
    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.rawSign({
      path: { curve: 'SECP256K1' },
      body: { params: '7369676e2074686973', share: 'share' }
    });

    expect(String(calls[0]?.input)).toBe('https://mpc-client.portalhq.io/v1/raw/sign/SECP256K1');
    expect(calls[0]?.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ params: '7369676e2074686973', share: 'share' })
    });
  });

  it('supports recover, sign, and idempotent sendAssets', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ data: '0xsigned' });
      }
    });
    const client = sdk.initClient({ token: 'portal-client-token' });

    await client.recoverWallet({ body: { backupResponse: '{"ok":true}' } });
    await client.sign({
      body: {
        share: 'share',
        method: 'eth_sendTransaction',
        params: { to: '0xabc', value: '0x01' },
        chainId: WalletChain.ETHEREUM_MAINNET,
        to: '0xabc'
      },
      headers: { 'Idempotency-Key': 'idem-1' }
    });
    await client.sendAssets({
      body: {
        share: 'share',
        chain: WalletChain.ETHEREUM_MAINNET,
        to: '0xabc',
        token: 'NATIVE',
        amount: '0.01',
        rpcUrl: 'https://caller.rpc'
      },
      headers: { 'Idempotency-Key': 'idem-2' }
    });

    expect(String(calls[0]?.input)).toBe('https://mpc-client.portalhq.io/v1/recover');
    expect(String(calls[1]?.input)).toBe('https://mpc-client.portalhq.io/v1/sign');
    expect(calls[1]?.init?.headers).toMatchObject({ 'idempotency-key': 'idem-1' });
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({
        share: 'share',
        method: 'eth_sendTransaction',
        params: { to: '0xabc', value: '0x01' },
        chainId: 'eip155:1',
        to: '0xabc',
        rpcUrl: 'https://ethereum-mainnet.gateway.tatum.io/tatum-api-key'
      })
    );
    // sign meters transaction usage against Tatum before sendAssets runs.
    expect(String(calls[2]?.input)).toBe('https://api.tatum.io/v4/wallets/usage/transaction');
    expect(calls[2]?.init?.headers).toMatchObject({
      'x-api-key': 'tatum-api-key',
      authorization: 'Bearer portal-client-token'
    });
    expect(String(calls[3]?.input)).toBe('https://mpc-client.portalhq.io/v1/assets/send');
    expect(calls[3]?.init?.headers).toMatchObject({ 'idempotency-key': 'idem-2' });
    expect(calls[3]?.init?.body).toBe(
      JSON.stringify({
        share: 'share',
        chain: 'eip155:1',
        to: '0xabc',
        token: 'NATIVE',
        amount: '0.01',
        rpcUrl: 'https://caller.rpc'
      })
    );
    // sendAssets meters transaction usage too.
    expect(String(calls[4]?.input)).toBe('https://api.tatum.io/v4/wallets/usage/transaction');
  });

  it('does not let a usage-metering failure break the signing operation', async () => {
    const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const sdk = new TatumWalletsSdk({
      apiKey: 'tatum-api-key',
      fetch: async (input, init) => {
        calls.push({ input, init });
        // Fail only the usage-metering call; the enclave sign must still succeed.
        if (String(input).includes('/v4/wallets/usage/')) {
          return jsonResponse({ message: 'metering down' }, { status: 500 });
        }
        return jsonResponse({ data: '0xsig' });
      }
    });
    const client = sdk.initClient({ token: 'portal-client-token' });

    const result = await client.rawSign({
      path: { curve: 'SECP256K1' },
      body: { params: '7369676e2074686973', share: 'share' }
    });

    expect(result).toEqual({ data: '0xsig' });
    expect(String(calls[0]?.input)).toBe('https://mpc-client.portalhq.io/v1/raw/sign/SECP256K1');
    expect(String(calls[1]?.input)).toBe('https://api.tatum.io/v4/wallets/usage/transaction');
  });
});

describe('WalletChain primary-chain mapping', () => {
  it('exposes a Portal config for every primary chain, with the enum value as the chainId', () => {
    const chains = Object.values(WalletChain);
    expect(chains).toHaveLength(13);

    for (const chain of chains) {
      const config = getWalletChainConfig(chain);
      expect(config).toBe(WALLET_CHAINS[chain]);
      // Enum value is the CAIP-2 id, so it round-trips through the config.
      expect(config.chainId).toBe(chain);
      expect(['SECP256K1', 'ED25519']).toContain(config.curve);
      expect(config.tatumNetwork).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('maps curves, rpc requirements, and Tatum RPC networks per Portal/Tatum docs', () => {
    expect(WALLET_CHAINS[WalletChain.ETHEREUM_MAINNET]).toEqual({
      chainId: 'eip155:1',
      curve: 'SECP256K1',
      requiresRpcUrl: false,
      tatumNetwork: 'ethereum-mainnet'
    });
    expect(WALLET_CHAINS[WalletChain.SOLANA_MAINNET].curve).toBe('ED25519');
    expect(WALLET_CHAINS[WalletChain.STELLAR_MAINNET].curve).toBe('ED25519');
    expect(WALLET_CHAINS[WalletChain.BITCOIN_MAINNET]).toEqual({
      chainId: 'bip122:000000000019d6689c085ae165831e93-p2wpkh',
      curve: 'SECP256K1',
      requiresRpcUrl: true,
      tatumNetwork: 'bitcoin-mainnet'
    });
    // Stellar, Tron, Celo, Bitcoin require an rpcUrl; the EVM L2s and Solana do not.
    expect(WALLET_CHAINS[WalletChain.TRON_MAINNET].requiresRpcUrl).toBe(true);
    expect(WALLET_CHAINS[WalletChain.CELO_MAINNET].requiresRpcUrl).toBe(true);
    expect(WALLET_CHAINS[WalletChain.BASE_MAINNET].requiresRpcUrl).toBe(false);
    // Non-obvious Tatum gateway slugs.
    expect(WALLET_CHAINS[WalletChain.ARBITRUM_MAINNET].tatumNetwork).toBe('arb-one-mainnet');
    expect(WALLET_CHAINS[WalletChain.AVALANCHE_MAINNET].tatumNetwork).toBe('avax-mainnet');
    expect(WALLET_CHAINS[WalletChain.ETHEREUM_SEPOLIA]).toEqual({
      chainId: 'eip155:11155111',
      curve: 'SECP256K1',
      requiresRpcUrl: false,
      tatumNetwork: 'ethereum-sepolia'
    });
  });
});

describe('WalletsClient enclave types', () => {
  const client = new TatumWalletsSdk({ apiKey: 'k', fetch: async () => new Response('{}') }).initClient({
    token: 't'
  });

  it('infers enclave response types and enforces bodies', () => {
    expectTypeOf(client.generateWallet()).resolves.toEqualTypeOf<GenerateWalletResponse>();
    expectTypeOf(client.sign).parameter(0).toMatchTypeOf<{ body: { method: string } }>();
    expectTypeOf(
      client.sendAssets({
        body: { share: 's', chain: WalletChain.ETHEREUM_MAINNET, to: '0x', token: 'NATIVE', amount: '0.1' }
      })
    ).resolves.toEqualTypeOf<SendAssetsResponse>();
    expectTypeOf(
      client.sign({
        body: { method: 'personal_sign', params: [], share: 's', chainId: WalletChain.ETHEREUM_MAINNET, to: '0x' }
      })
    ).resolves.toEqualTypeOf<SignResponse>();
  });
});

describe('WalletsClient client-scoped types', () => {
  const client = new TatumWalletsSdk({ apiKey: 'k', fetch: async () => new Response('{}') }).initClient({
    token: 't'
  });

  it('infers client response types and enforces path/query/body', () => {
    expectTypeOf(client.getClientDetails()).resolves.toEqualTypeOf<ClientDetails>();
    expectTypeOf(client.buildTransaction)
      .parameter(0)
      .toMatchTypeOf<{ path: { chain: WalletChain }; body: { to: string } }>();
    expectTypeOf(
      client.getEjectableBackupShares({ path: { walletId: 'w' }, query: { backupMethod: 'PASSWORD' } })
    ).resolves.toEqualTypeOf<ClientEjectableBackupSharesResponse>();
    expectTypeOf(client.completeEject({ path: { walletId: 'w' } })).resolves.toEqualTypeOf<void>();
    void ({} as BuildTransactionResponse);
  });
});

describe('CustodianApi types', () => {
  const custodian = new TatumWalletsSdk({
    apiKey: 'k',
    fetch: async () => new Response('{}')
  }).custodian;

  it('infers custodian response types and enforces path/query/body', () => {
    expectTypeOf(custodian.createClient({ body: { isAccountAbstracted: false } })).resolves.toEqualTypeOf<CreateClientResponse>();
    expectTypeOf(custodian.listClients({ query: { take: 10 } })).resolves.toEqualTypeOf<ListClientsResponse>();
    expectTypeOf(custodian.getClient({ path: { clientId: 'c' } })).resolves.toEqualTypeOf<ClientDetails>();
    expectTypeOf(custodian.getClient).parameter(0).toMatchTypeOf<{ path: { clientId: string } }>();
    expectTypeOf(custodian.enableEject({ path: { clientId: 'c' }, body: { walletId: 'w' } })).resolves.toEqualTypeOf<EnableEjectResponse>();
    expectTypeOf(custodian.getEjectableBackupShares({ path: { clientId: 'c', walletId: 'w' } })).resolves.toEqualTypeOf<EjectableBackupShares>();
  });
});
