# `@tatumio/wallet-sdk` — Usage Guide & API Reference

A TypeScript SDK for **Tatum MPC wallets**: create wallets, sign and send transactions,
back up and recover keys, and manage end-user clients — all from your backend with a single
Tatum API key.

- [Concepts](#concepts)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Supported chains](#supported-chains)
- [Guides](#guides)
  - [Managing clients](#managing-clients-custodian)
  - [Generating a wallet](#generating-a-wallet)
  - [Sending assets](#sending-assets)
  - [Signing](#signing)
  - [Evaluating a transaction before signing](#evaluating-a-transaction-before-signing)
  - [Backup & recovery](#backup--recovery)
  - [Key eject](#key-eject)
  - [Escape hatches](#escape-hatches)
- [API reference](#api-reference)
- [Key types](#key-types)
- [Error handling](#error-handling)
- [TypeScript notes](#typescript-notes)

---

## Concepts

The SDK is built on **multi-party computation (MPC)**. A wallet's private key is never
assembled in one place. Instead it is split into a **2-of-2** scheme: one **client share**
(which you store) and one **Tatum-held share**. Both are required to produce a signature, so
losing one share alone never exposes the key. Backups work by *re-sharing* — deriving a new,
encryptable copy of a share without ever reconstructing the key.

Each wallet holds **one signing share per curve**:

- `SECP256K1` — EVM chains (Ethereum, Base, Polygon, …), Bitcoin, Tron.
- `ED25519` — Solana, Stellar.

One generated wallet therefore covers both EVM and non-EVM chains; you pick the right
`shares[curve]` when signing for a given chain (`WALLET_CHAINS[chain].curve` tells you which).

### Three usage surfaces

| Surface | Auth | Use for |
| --- | --- | --- |
| `sdk.custodian.*` | Your Tatum `x-api-key` (auto-resolved to a custodian token) | Creating/listing end-user **clients**, minting session tokens, key eject. |
| `sdk.initClient({ token }).*` | A client's token | Acting **on behalf of one end-user**: generate, sign, send, backup, recover. |
| `sdk.api.request(...)` | Your Tatum `x-api-key` | Raw Tatum HTTP calls not yet wrapped by a typed method. |

A **client** is one end-user wallet holder under your custodian account. `initClient` accepts
either of two token types returned when you create a client:

- **Client API key** — long-lived; good for server-side use.
- **Client Session Token (CST)** — short-lived; good for handing to a client app for a session.

---

## Installation

```sh
npm install @tatumio/wallet-sdk
```

- **ESM-only** (`"type": "module"`) — use `import`, not `require`.
- **Node ≥ 18** (relies on the global `fetch`).
- Ships its own TypeScript types; no `@types` package needed.

---

## Quick start

```ts
import { TatumWalletsSdk, WalletChain } from "@tatumio/wallet-sdk";

const wallets = new TatumWalletsSdk({ apiKey: process.env.TATUM_API_KEY! });

// 1. Register an end-user client (custodian-scoped).
const newClient = await wallets.custodian.createClient({
  body: { isAccountAbstracted: false },
});

// 2. Act on behalf of that client.
const client = wallets.initClient({ token: newClient.clientApiKey! });

// 3. Generate an MPC wallet (one share per curve). Store these shares.
const shares = await client.generateWallet();

// 4. Send native ETH in one call.
const sent = await client.sendAssets({
  body: {
    share: shares.SECP256K1.share,
    chain: WalletChain.ETHEREUM_MAINNET,
    to: "0xRecipient...",
    token: "NATIVE",
    amount: "0.01",
  },
});

console.log(sent.transactionHash);
```

---

## Configuration

`new TatumWalletsSdk(config)` takes a `WalletsSDKConfig`:

```ts
interface WalletsSDKConfig {
  apiKey: string;                    // required — your Tatum API key
  baseUrl?: string;                  // default 'https://api.tatum.io'
  headers?: Record<string, string>;  // extra headers on every request
  fetch?: typeof fetch;              // custom fetch (tests, proxies, instrumentation)
}
```

Only `apiKey` is required. The custodian token and per-chain RPC URLs are resolved
automatically from this key — you never pass them yourself (see
[Sending assets](#sending-assets) for RPC details).

---

## Supported chains

Chain fields take the **`WalletChain` enum**, not raw strings — `chain` / `chainId` on
`sign`, `sendAssets`, `evaluateTransaction`, and the `{chain}` path on `buildTransaction`.
Each enum value **is** the chain's CAIP-2 id, so it can be passed directly wherever the API
expects one.

```ts
import { WalletChain, WALLET_CHAINS, getWalletChainConfig } from "@tatumio/wallet-sdk";

const cfg = getWalletChainConfig(WalletChain.SOLANA_MAINNET);
// → { chainId, curve: 'ED25519', requiresRpcUrl: false, tatumRpcNetwork: 'solana-mainnet' }
```

| `WalletChain` | CAIP-2 id | Curve | `requiresRpcUrl` |
| --- | --- | --- | --- |
| `ETHEREUM_MAINNET` | `eip155:1` | SECP256K1 | false |
| `ETHEREUM_SEPOLIA` | `eip155:11155111` | SECP256K1 | false |
| `MONAD_MAINNET` | `eip155:143` | SECP256K1 | false |
| `ARBITRUM_MAINNET` | `eip155:42161` | SECP256K1 | false |
| `AVALANCHE_MAINNET` | `eip155:43114` | SECP256K1 | false |
| `BASE_MAINNET` | `eip155:8453` | SECP256K1 | false |
| `OPTIMISM_MAINNET` | `eip155:10` | SECP256K1 | false |
| `POLYGON_MAINNET` | `eip155:137` | SECP256K1 | false |
| `CELO_MAINNET` | `eip155:42220` | SECP256K1 | true |
| `BITCOIN_MAINNET` | `bip122:000000000019d6689c085ae165831e93-p2wpkh` | SECP256K1 | true |
| `TRON_MAINNET` | `tron:mainnet` | SECP256K1 | true |
| `SOLANA_MAINNET` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | ED25519 | false |
| `STELLAR_MAINNET` | `stellar:pubnet` | ED25519 | true |

`requiresRpcUrl` only signals whether the chain *needs* an RPC URL for enclave operations —
the SDK supplies one automatically regardless (see below). `WALLET_CHAINS[chain]` returns the
full `WalletChainConfig`.

---

## Guides

### Managing clients (custodian)

Use the custodian surface to provision and inspect end-user clients. Authenticated with your
Tatum API key.

```ts
// Create a client. Returns id, clientApiKey, and an initial clientSessionToken.
const created = await wallets.custodian.createClient({
  body: { isAccountAbstracted: false },
});

// List clients (cursor-paginated, take ≤ 100).
const page = await wallets.custodian.listClients({ query: { take: 100 } });

// Fetch one client's wallets, addresses, and share-pair statuses.
const detail = await wallets.custodian.getClient({ path: { clientId: created.id! } });

// Mint a fresh short-lived Client Session Token for an existing client.
const session = await wallets.custodian.createClientSession({
  path: { clientId: created.id! },
  body: { isAccountAbstracted: false },
});
```

**When:** server-side onboarding and administration. To then act *as* a client, pass
`created.clientApiKey` or `session.clientSessionToken` to `initClient`.

### Generating a wallet

```ts
const client = wallets.initClient({ token: created.clientApiKey! });

const shares = await client.generateWallet();
// shares.SECP256K1 = { id, share }, shares.ED25519 = { id, share }
```

`generateWallet` returns one signing share per curve. **You must persist these shares** —
they are the client's half of the 2-of-2 key. After storing them, confirm storage so the
server marks the pairs complete:

```ts
await client.updateSigningSharePairs({
  body: {
    signingSharePairIds: [shares.SECP256K1.id, shares.ED25519.id],
    status: "STORED_CLIENT",
  },
});
```

**When:** once per end-user wallet. Treat the shares like secrets.

### Sending assets

Two paths:

- **`sendAssets`** — build, sign, and broadcast in one call. Simplest; use this by default.
- **`buildTransaction` + `sign`** — build an unsigned transaction, inspect/modify, then sign
  and submit separately. Use when you need the raw transaction first.

```ts
const sent = await client.sendAssets({
  body: {
    share: shares.SECP256K1.share,
    chain: WalletChain.ETHEREUM_MAINNET,
    to: "0xRecipient...",
    token: "NATIVE",          // or a contract/mint address, e.g. a USDC address
    amount: "0.01",
  },
});
// sent.transactionHash, sent.metadata.{amount,rawAmount,tokenAddress,tokenDecimals}
```

**RPC URL injection.** Enclave operations (`sendAssets`, `sign`) need a chain RPC URL. The SDK
resolves a Tatum gateway URL automatically — `https://<network>.gateway.tatum.io/<your-api-key>`,
where `<network>` is the chain's `tatumRpcNetwork`. Pass an explicit `rpcUrl` in the body only
to override it (e.g. your own node):

```ts
await client.sendAssets({
  body: { /* … */ rpcUrl: "https://my-own-node.example/rpc" },
});
```

### Signing

`sign` runs an RPC signing method and, for transaction methods, submits it:

```ts
const signed = await client.sign({
  body: {
    share: shares.SECP256K1.share,
    method: "personal_sign",                 // or 'eth_sendTransaction', 'sol_signTransaction', …
    params: ["0x48656c6c6f"],                // method-dependent
    chainId: WalletChain.ETHEREUM_MAINNET,
    to: "0xRecipient...",
  },
}); // → { data }
```

`rawSign` signs a bare hex digest with a given curve — no chain or RPC context. Use it for
custom signing schemes:

```ts
const raw = await client.rawSign({
  path: { curve: "SECP256K1" },
  body: { params: "7369676e2074686973", share: shares.SECP256K1.share }, // hex, no 0x
}); // → { data }
```

`sponsorGas` defaults to `true` on `sign`/`sendAssets`; set it `false` to pay gas from the
wallet itself.

### Evaluating a transaction before signing

Simulate and/or validate a transaction — balance changes and a risk score — before committing:

```ts
const evaluation = await client.evaluateTransaction({
  query: { chainId: WalletChain.ETHEREUM_MAINNET },
  body: {
    network: "ethereum",
    transaction: { toAddress: "0xRecipient...", value: "10000000000000000" }, // wei
    // operationType defaults to 'all' (validation + simulation)
  },
}); // → { evaluation?, unsignedTx? }
```

**When:** before signing high-value or untrusted transactions, to surface unexpected balance
changes or risk.

### Backup & recovery

Backups let a client recover its signing shares later. **You own the encryption** — the SDK
stores only ciphertext you produce.

**Back up:**

```ts
const backup = await client.backupWallet({
  body: { generateResponse: JSON.stringify(shares) },
}); // → per-curve backup shares { SECP256K1: { id, share }, ED25519: { id, share } }

for (const curve of ["SECP256K1", "ED25519"] as const) {
  const { id, share } = backup[curve];
  await client.storeEncryptedBackupShare({
    path: { backupSharePairId: id },
    body: { clientCipherText: await yourEncrypt(share) }, // your encryption
  });
}

// Mark the pairs stored — the final step.
await client.updateBackupSharePairs({
  body: {
    backupSharePairIds: [backup.SECP256K1.id, backup.ED25519.id],
    status: "STORED_CLIENT_BACKUP_SHARE",
  },
});
```

**Recover** — fetch each stored ciphertext, decrypt it, rebuild the backup-response shape, and
re-share:

```ts
const restore = async (curve: "SECP256K1" | "ED25519", backupSharePairId: string) => {
  const { cipherText } = await client.getBackupShareCipherText({ path: { backupSharePairId } });
  return { share: await yourDecrypt(cipherText), id: backupSharePairId };
};

const backupResponse = {
  SECP256K1: await restore("SECP256K1", secpBackupSharePairId),
  ED25519: await restore("ED25519", edBackupSharePairId),
};

const recovered = await client.recoverWallet({
  body: { backupResponse: JSON.stringify(backupResponse) },
}); // → fresh signing shares
```

> Alternatively store the ciphertext on your own backend and skip `storeEncryptedBackupShare`;
> still call `updateBackupSharePairs` to mark the pairs stored.

### Key eject

Eject lets an end-user reconstruct their **full private key off-platform** — an exit/escape
mechanism. It is a two-side flow.

**Custodian side** — authorize the eject and (optionally) fetch the custodian-held shares:

```ts
await wallets.custodian.enableEject({
  path: { clientId: created.id! },
  body: { walletId: "wallet-1", ejectableUntil: "2026-07-01T00:00:00.000Z" },
});

const custodianShares = await wallets.custodian.getEjectableBackupShares({
  path: { clientId: created.id!, walletId: "wallet-1" },
});
```

**Client side** — fetch the client's ejectable shares for a backup method, reconstruct the key
locally, then finalize:

```ts
const shares = await client.getEjectableBackupShares({
  path: { walletId: "wallet-1" },
  query: { backupMethod: "PASSWORD" }, // 'GDRIVE' | 'ICLOUD' | 'PASSWORD' | 'PASSKEY'
});

// …reconstruct the private key off Portal…

await client.completeEject({ path: { walletId: "wallet-1" } });
```

**When:** giving end-users a credible exit so they are never locked in.

### Escape hatches

For anything not yet wrapped by a typed method:

```ts
// Raw Tatum HTTP call (x-api-key auth).
const health = await wallets.api.request<{ ok: boolean }>({ method: "GET", path: "/health" });
// Convenience verbs also exist: wallets.api.get/post/put/patch/delete.

// Raw client REST operation by name.
await client.request("getClientDetails");

// Raw enclave (MPC) operation by name — rpcUrl auto-injected from body chain/chainId.
await client.enclaveRequest("generateWallet");
```

Prefer the typed methods; use these only for not-yet-modeled behavior.

---

## API reference

Every method is generic on its response type (`<TResponse = …>`) with the documented default,
and takes a uniform options object: `{ path?, query?, body?, headers?, signal? }`. Fields not
applicable to an operation are typed away (e.g. a method with no body forbids `body`).

### `TatumWalletsSdk`

| Member | Signature | Returns | When |
| --- | --- | --- | --- |
| `api` | `WalletsApiClient` | — | Raw Tatum HTTP escape hatch. |
| `custodian` | `CustodianApi` | — | Custodian-scoped operations. |
| `initClient` | `initClient(config: { token: string })` | `WalletsClient` | Act as one client. |

### Custodian — `sdk.custodian`

| Method | Body / Path / Query | Returns | When |
| --- | --- | --- | --- |
| `createClient` | body `CreateClientBody?` | `CreateClientResponse` | Register a new client. |
| `listClients` | query `ListClientsQuery?` | `ListClientsResponse` | Paginated client list. |
| `getClient` | path `{ clientId }` | `ClientDetails` | One client's details. |
| `createClientSession` | path `{ clientId }`, body `CreateClientSessionBody` | `CreateClientSessionResponse` | Mint a CST. |
| `buildTransaction` | path `{ clientId, chain }`, body `BuildTransactionBody` | `BuildTransactionResponse` | Build unsigned tx for a client. |
| `enableEject` | path `{ clientId }`, body `EnableEjectBody` | `EnableEjectResponse` | Authorize key eject. |
| `getEjectableBackupShares` | path `{ clientId, walletId }` | `EjectableBackupShares` | Custodian-side eject shares. |
| `request` | `(operationName, options?)` | `unknown` | Escape hatch by operation name. |

### Client REST — `sdk.initClient(...)`

| Method | Body / Path / Query | Returns | When |
| --- | --- | --- | --- |
| `getClientDetails` | — | `ClientDetails` | This client's wallets/addresses/share statuses. |
| `buildTransaction` | path `{ chain }`, body `BuildTransactionBody` | `BuildTransactionResponse` | Build unsigned tx; sign separately. |
| `evaluateTransaction` | query `EvaluateTransactionQuery`, body `EvaluateTransactionBody` | `EvaluateTransactionResponse` | Simulate/validate before signing. |
| `updateSigningSharePairs` | body `UpdateSigningSharePairsBody` | `void` | Confirm signing shares stored. |
| `updateBackupSharePairs` | body `UpdateBackupSharePairsBody` | `void` | Final step of a backup. |
| `storeEncryptedBackupShare` | path `{ backupSharePairId }`, body `StoreBackupShareBody` | `void` | Store one curve's ciphertext. |
| `getBackupShareCipherText` | path `{ backupSharePairId }` | `BackupShareCipherTextResponse` | Read a stored ciphertext. |
| `getEjectableBackupShares` | path `{ walletId }`, query `ClientEjectableBackupSharesQuery` | `ClientEjectableBackupSharesResponse` | Client-side eject shares. |
| `completeEject` | path `{ walletId }` | `void` | Finalize an eject. |
| `request` | `(operationName, options?)` | `unknown` | Client REST escape hatch. |

### Enclave / MPC — `sdk.initClient(...)`

| Method | Body / Path | Returns | When |
| --- | --- | --- | --- |
| `generateWallet` | — | `GenerateWalletResponse` (`CurveShares`) | New MPC wallet (per-curve shares). |
| `backupWallet` | body `BackupWalletBody` | `BackupWalletResponse` (`CurveShares`) | Produce backup shares. |
| `recoverWallet` | body `RecoverWalletBody` | `RecoverWalletResponse` (`CurveShares`) | Reconstruct signing shares. |
| `sign` | body `SignBody` | `SignResponse` | Sign (and submit) via an RPC method. |
| `rawSign` | path `{ curve }`, body `RawSignBody` | `RawSignResponse` | Raw-sign a hex digest. |
| `sendAssets` | body `SendAssetsBody` | `SendAssetsResponse` | Build + sign + broadcast a transfer. |
| `enclaveRequest` | `(operationName, options?)` | `unknown` | Enclave escape hatch (auto `rpcUrl`). |

### Tatum HTTP client — `sdk.api`

| Method | Signature |
| --- | --- |
| `get` | `get<T>(path, options?)` |
| `post` | `post<T>(path, body?, options?)` |
| `put` | `put<T>(path, body?, options?)` |
| `patch` | `patch<T>(path, body?, options?)` |
| `delete` | `delete<T>(path, options?)` |
| `request` | `request<T>(options: ApiRequestOptions)` |

`ApiRequestOptions` requires `path` and allows `method`, `query`, `body`, `headers`, `signal`.

---

## Key types

```ts
interface WalletsSDKConfig {
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

type Curve = "SECP256K1" | "ED25519";

interface WalletShare { share: string; id: string }
interface CurveShares { SECP256K1: WalletShare; ED25519: WalletShare }

// generate / backup / recover all return CurveShares
type GenerateWalletResponse = CurveShares;
type BackupWalletResponse = CurveShares;
type RecoverWalletResponse = CurveShares;

interface CreateClientResponse {
  id?: string;
  clientApiKey?: string;
  clientSessionToken?: string;
  isAccountAbstracted?: boolean;
}

interface SignBody {
  method: string;            // e.g. 'eth_sendTransaction', 'personal_sign'
  params: object | unknown[];
  share: string;
  chainId: WalletChain;
  to: string;
  rpcUrl?: string;           // auto-injected when omitted
  metadataStr?: string;
  sponsorGas?: boolean;      // default true
  presignature?: string;     // mutually exclusive with presignatureId
  presignatureId?: string;
}

interface SendAssetsBody {
  share: string;
  chain: WalletChain;
  to: string;
  token: string;             // contract/mint address or 'NATIVE'
  amount: string;
  rpcUrl?: string;           // auto-injected when omitted
  nonce?: string;
  metadataStr?: string;
  sponsorGas?: boolean;      // default true
  presignature?: string;
  presignatureId?: string;
}

interface SendAssetsResponse {
  transactionHash: string;
  metadata: { amount: string; rawAmount: string; tokenAddress: string; tokenDecimals: number };
}

interface EvaluateTransactionBody {
  network: string;           // 'ethereum', 'solana', …
  transaction: { toAddress: string; value: string; data?: string;
                 token?: { address: string; decimals: number; symbol: string } };
  operationType?: "validation" | "simulation" | "all"; // default 'all'
}

interface EnableEjectBody { walletId: string; ejectableUntil?: string } // ISO date-time

type EjectableBackupSharesBackupMethod = "GDRIVE" | "ICLOUD" | "PASSWORD" | "PASSKEY";
```

`ClientDetails` (returned by `getClient` / `getClientDetails`) carries `wallets[]`, each with
`curve`, `publicKey`, and `signingSharePairs` / `backupSharePairs` statuses, plus
`metadata.namespaces` mapping each curve to its derived address.

`BuildTransactionResponse` is a union of chain-shaped results
(`Eip155TransactionResult | SolanaTransactionResult | BitcoinTransactionResult |
StellarTransactionResult | TronTransactionResult`) with no discriminator field — narrow by
the shape of `transaction` for the chain you targeted.

---

## Error handling

Any non-2xx response throws a `WalletsApiError`:

```ts
import { WalletsApiError } from "@tatumio/wallet-sdk";

try {
  await client.sendAssets({ body: { /* … */ } });
} catch (err) {
  if (err instanceof WalletsApiError) {
    console.error(err.status, err.statusText, err.body);
    // err.headers is the response Headers
  }
}
```

| Property | Type | Notes |
| --- | --- | --- |
| `status` | `number` | HTTP status code. |
| `statusText` | `string \| undefined` | HTTP status text. |
| `body` | `unknown` | Parsed response body (JSON when available). |
| `headers` | `Headers \| undefined` | Response headers. |

---

## TypeScript notes

- **Generics with defaults.** Each method is `<TResponse = …>`; the default matches the
  documented return type, so you usually omit the type argument. Override it (e.g.
  `client.request<MyShape>(...)`) when using an escape hatch.
- **Uniform request shape.** Every typed method takes `{ path?, query?, body?, headers?,
  signal? }`. `path` is a map of path parameters (e.g. `{ clientId }`), interpolated into the
  operation's URL template; missing path params throw before any request is sent, and values
  are URL-encoded.
- **Cancellation.** Pass an `AbortSignal` via `signal` to cancel in-flight requests.
- **Per-request headers.** Pass `headers` (e.g. an `Idempotency-Key`) on any call.
- **Chains are typed.** `chain` / `chainId` accept the `WalletChain` enum; raw strings are
  rejected at compile time.
