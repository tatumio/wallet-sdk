# @tatumio/wallet-sdk

TypeScript SDK for Tatum MPC wallets — wallet creation, signing, sending, backup/recovery, and custodian/client management.

## Installation

```sh
npm install @tatumio/wallet-sdk
```

## Usage

```ts
import { TatumWalletsSdk } from "@tatumio/wallet-sdk";

// Backend: pass your Tatum API key to use custodian operations.
const wallets = new TatumWalletsSdk({
  apiKey: process.env.TATUM_API_KEY!,
  baseUrl: "https://api.tatum.io",
});

// Client-side (browser/mobile): no apiKey — authenticate with a client token only.
const clientSide = new TatumWalletsSdk();
const client = clientSide.initClient({ token: clientSessionToken });
```

The `apiKey` is **required only for custodian / `sdk.api` operations** (backend). Client-scoped
operations (`initClient`) authenticate with a client token and need no Tatum key, so the
SDK is safe to run client-side. For lower-level or not-yet-modeled Tatum calls, use
`wallets.api.request(...)` directly.

See [docs/USAGE.md](docs/USAGE.md) for the full guide and complete API reference.

## Custodian and Client Operations

Custodian-scoped calls are authenticated through your Tatum API key:

```ts
// Response is typed as CreateClientResponse ({ id, clientApiKey, clientSessionToken, ... }).
const newClient = await wallets.custodian.createClient({
  body: {
    isAccountAbstracted: false,
  },
});

const clients = await wallets.custodian.listClients({
  query: {
    take: 100,
  },
});

// Mint a Client Session Token (CST) for an existing client.
const session = await wallets.custodian.createClientSession({
  path: { clientId: newClient.id! },
  body: { isAccountAbstracted: false },
});
```

Client-scoped calls use the client API key or client session token for the selected client:

```ts
import { WalletChain } from "@tatumio/wallet-sdk";

const client = wallets.initClient({
  token: newClient.clientApiKey ?? session.clientSessionToken!,
});

const details = await client.getClientDetails(); // typed as ClientDetails
const shares = await client.generateWallet(); // typed as GenerateWalletResponse

await client.sendAssets({
  body: {
    share: shares.SECP256K1.share,
    chain: WalletChain.ETHEREUM_MAINNET,
    to: "0x...",
    token: "NATIVE",
    amount: "0.01",
    rpcUrl: "https://ethereum-mainnet.gateway.tatum.io/<your-key>", // required — see RPC URL below
  },
});
```

Chain fields (`chain` / `chainId` on sign, sendAssets, evaluate, and the `{chain}` path on build-transaction) take the `WalletChain` enum rather than raw strings. Each value is the chain's CAIP-2 id, and `WALLET_CHAINS[chain]` / `getWalletChainConfig(chain)` expose its `curve` and `requiresRpcUrl`. Primary chains: Monad, Ethereum, Solana, Stellar, Tron, Bitcoin, Arbitrum, Avalanche, Base, Optimism, Polygon, Celo (all `_MAINNET`), plus `ETHEREUM_SEPOLIA` (testnet).

### Signing

`sign` accepts any supported RPC signing method (`eth_sendTransaction`, `personal_sign`, `sol_signTransaction`). `rawSign` signs a hex digest directly with a given curve, with no chain/RPC context:

```ts
const signed = await client.sign({
  body: {
    share: shares.SECP256K1.share,
    method: "personal_sign",
    params: ["0x48656c6c6f"],
    chainId: WalletChain.ETHEREUM_MAINNET,
    to: "0x...",
    rpcUrl: "https://ethereum-mainnet.gateway.tatum.io/<your-key>", // required
  },
});

const raw = await client.rawSign({
  path: { curve: "SECP256K1" },
  body: { params: "7369676e2074686973", share: shares.SECP256K1.share },
}); // typed as RawSignResponse ({ data })
```

Before signing, you can simulate/validate a transaction (balance changes, risk score):

```ts
const evaluation = await client.evaluateTransaction({
  query: { chainId: WalletChain.ETHEREUM_MAINNET },
  body: { to: "0x...", value: "0x2386f26fc10000", operationType: "all" },
}); // typed as EvaluateTransactionResponse ({ chain, validation?, simulation? })
```

### Backup and recovery

Back up the signing shares, encrypt each curve's share yourself, store the ciphertext via the SDK, then mark the pairs stored:

```ts
const backup = await client.backupWallet({
  body: { generateResponse: JSON.stringify(shares) },
}); // typed as BackupWalletResponse (per-curve shares)

for (const curve of ["SECP256K1", "ED25519"] as const) {
  const { id, share } = backup[curve];
  await client.storeEncryptedBackupShare({
    path: { backupSharePairId: id },
    body: { clientCipherText: await yourEncrypt(share) },
  });
}

await client.updateBackupSharePairs({
  body: {
    backupSharePairIds: [backup.SECP256K1.id, backup.ED25519.id],
    status: "STORED_CLIENT_BACKUP_SHARE",
  },
});
```

To recover, fetch and decrypt each curve's stored ciphertext, rebuild the backup
response shape (`{ SECP256K1: { share, id }, ED25519: { share, id } }`), then pass
it to `recoverWallet`:

```ts
const restore = async (
  curve: "SECP256K1" | "ED25519",
  backupSharePairId: string,
) => {
  const { cipherText } = await client.getBackupShareCipherText({
    path: { backupSharePairId },
  });
  return { share: await yourDecrypt(cipherText), id: backupSharePairId };
};

const backupResponse = {
  SECP256K1: await restore("SECP256K1", secpBackupSharePairId),
  ED25519: await restore("ED25519", edBackupSharePairId),
};

const recovered = await client.recoverWallet({
  body: { backupResponse: JSON.stringify(backupResponse) },
}); // typed as RecoverWalletResponse
```

### RPC URL

Enclave operations that touch a chain (`sign`, `sendAssets`) **require an explicit `rpcUrl`** in
the body — the SDK no longer injects one. Pass any node:

- **Your own node**, or any provider (Infura, Alchemy, self-hosted).
- **A Tatum gateway** — `https://<network>.gateway.tatum.io` (the `<network>` slug is each chain's
  `tatumNetwork`; see `WALLET_CHAINS`). For production, authenticate it with your key via the
  `x-api-key` header — **never** put the key in the URL path (it leaks through logs/referrers).
  The keyless anonymous gateway works but is rate-limited to a few requests/min — fine for dev only.

Authentication note: custodian-scoped calls use your Tatum `x-api-key`. Client-scoped calls
(`initClient`) use the client token and need **no** Tatum key.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

## Publishing

The package is configured for public npm publishing under the scoped package name:

```sh
npm publish --access public
```
