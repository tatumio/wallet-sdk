# @tatumio/wallet-sdk

TypeScript SDK for Tatum MPC wallets — wallet creation, signing, sending, backup/recovery, and custodian/client management.

## Installation

```sh
npm install @tatumio/wallet-sdk
```

## Usage

```ts
import { TatumWalletsSdk } from "@tatumio/wallet-sdk";

const wallets = new TatumWalletsSdk({
  apiKey: process.env.TATUM_API_KEY!,
  baseUrl: "https://api.tatum.io",
});
```

For lower-level or not-yet-modeled Tatum calls, use `wallets.api.request(...)` directly.

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
  body: {
    network: "ethereum",
    transaction: { toAddress: "0x...", value: "10000000000000000" },
  },
}); // typed as EvaluateTransactionResponse
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

Custodian-scoped calls are authenticated through Tatum: the SDK resolves the custodian token from your Tatum `x-api-key` via `GET /v4/wallets/custodian-api-key` (throwing if your key isn't authorized for wallets). Enclave operations that need an RPC URL get one automatically — the SDK builds `https://<network>.gateway.tatum.io/<your-api-key>` from the chain's `tatumNetwork` (see `WALLET_CHAINS`) — unless you pass an explicit `rpcUrl` in the body.

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
