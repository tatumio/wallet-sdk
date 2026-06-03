# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm test` — run Vitest suite once. `npm run test:watch` for watch mode.
- Run a single test file: `npx vitest run test/portal.test.ts`. Filter by name: `npx vitest run -t 'sends JSON requests'`.
- `npm run typecheck` — `tsc --noEmit` (type-checks `src` + `test` via `tsconfig.json`).
- `npm run build` — compile `src/` → `dist/` via `tsconfig.build.json` (excludes `test`).
- `npm run clean` — remove `dist/` and `coverage/`.
- Verify package contents without publishing: `npm --cache ./.npm-cache pack --dry-run`.
- `prepublishOnly` gates publish on: `npm test && npm run typecheck && npm run build`. Run all three before handing off changes.

This folder is a git repo on `master` (also the default/PR branch). Conventional Commit messages (`feat:`, `fix:`, `test:`) are **required** — release-please derives versions and the changelog from them.

## Architecture

TypeScript ESM SDK wrapping the **Portal** wallet API behind one entrypoint (`TatumWalletsSdk` in `src/sdk.ts`). Source is grouped by side and, within Portal, by layer:

> **Naming policy:** "Portal" is an internal implementation detail — it must NOT appear in consumer-facing surfaces: README, exported identifiers in `chains.ts` (`WALLET_CHAINS`, `WalletChainConfig`, `getWalletChainConfig`, field `chainId`), or new public export names. Internal classes/files (`PortalApiClient`, `PortalTatumProvider`, the `portal/` directory) keep their Portal names. Known leftovers still public: the exported `PortalRequestOptions` type and Portal mentions in JSDoc that lands in published `.d.ts` — don't add more; prefer vendor-neutral wording when touching either.

```
src/
  sdk.ts, index.ts, types.ts, errors.ts, http.ts, operation.ts, path.ts, chains.ts
  constants/            urls.ts (base URLs), paths.ts (Tatum endpoint paths)
  tatum/                api-client.ts (WalletsApiClient), provider.ts (PortalTatumProvider)
  portal/               transport.ts (PortalApiClient)
    custodian.ts        CustodianApi               — custodian layer
    client-api.ts       ClientApi                  — client-scoped REST layer
    enclave-api.ts      EnclaveApi                 — Enclave MPC layer
    wallets-client.ts   WalletsClient              — facade over ClientApi + EnclaveApi
    types/              shared.ts, custodian.ts, client.ts, enclave.ts, index.ts (barrel)
```

Two HTTP clients exist, differing in **base URL** and **auth header** — the key thing to keep straight:

1. **Portal APIs** (`PortalApiClient` in `portal/transport.ts`) — base `https://api.portalhq.io/api/v3` (and enclave base `https://mpc-client.portalhq.io`), auth via `Authorization: Bearer <token>`. Wrapped per layer: `CustodianApi` (custodian-scoped), `ClientApi` (client-scoped REST), `EnclaveApi` (MPC share ops). This is the SDK's product surface.
2. **Tatum client** (`WalletsApiClient` in `tatum/api-client.ts`) — base `https://api.tatum.io`, auth via `x-api-key`. No generated wrappers; it exists only so `PortalTatumProvider` can fetch the Portal custodian token from Tatum, and as the `wallets.api.request(...)` escape hatch for raw Tatum calls.

> **Temporarily removed:** the generated `BlockchainDataApi` and `NotificationsApi` Tatum surfaces were deleted to keep the SDK Portal-focused. They will be re-added later — don't treat their absence as permanent, and re-introduce them following the operation-map pattern when needed.

`tatum/api-client.ts` and `portal/transport.ts` are intentionally near-duplicate fetch wrappers (both extend the shared `HttpClient` in `http.ts`) that differ only in the auth header. Keep them in sync when touching request/URL/serialization logic.

### Layer separation (custodian / client / enclave)

The three Portal layers are physically separated: `CustodianApi`, `ClientApi`, and `EnclaveApi` are independent classes, each with its own operation map and constructed with just the token (+ provider, for enclave RPC injection). `WalletsClient` is a **thin facade** returned by `initClient()` — it composes a `ClientApi` and an `EnclaveApi` and delegates each public method to one of them. The public surface (flat methods on `WalletsClient`) is unchanged; the split is internal. Consumer-facing JSDoc lives on the `WalletsClient` facade; the layer classes stay lean.

### Operation-map pattern

Every API group is written the same way: a `const xxxOperations = { opName: { method, path } } as const` map plus a class with one thin typed method per operation that delegates to a shared `request(operationName, options)` (each method builds its request via `buildRequestOptions` in `operation.ts`). The `RequestOptions` shape is uniform across all groups:

```ts
{ path?, query?, body?, headers?, signal? }
```

Path params use `{name}` templates resolved by `interpolatePath` (`path.ts`), which **throws** on a missing/null param and `encodeURIComponent`s values. Query arrays are appended as repeated keys; `null`/`undefined` query values are dropped.

The Portal layer classes are hand-written and follow this pattern. (When the Tatum blockchain-data / notifications surfaces are re-added, they are **generated** from Tatum OpenAPI specs — method names match OpenAPI `operationId`; regenerate from the spec rather than hand-editing.)

### Chains

`src/chains.ts` exposes the `WalletChain` enum (Portal primary-support chains; each value is the chain's CAIP-2 id), the `WALLET_CHAINS` config map (`{ chainId, curve, requiresRpcUrl, tatumRpcNetwork }`), and `getWalletChainConfig`. `tatumRpcNetwork` is the `gateway.tatum.io` subdomain used to build the chain's RPC URL. Portal chain fields (`SignBody.chainId`, `SendAssetsBody.chain`, `EvaluateTransactionQuery.chainId`, and `buildTransaction`'s `{chain}` path) are typed as `WalletChain`, not raw strings.

### Portal token / RPC indirection

`PortalTatumProvider` (`tatum/provider.ts`) supplies the Portal custodian token and per-chain RPC URLs. `getCustodianToken()` fetches `GET /v4/wallets/custodian-api-key` via the Tatum client, returns `portalCustodianApiKey`, throws if the Tatum key isn't authorized for Portal, and memoizes the result (resetting on failure). `getRpcUrl(chain)` builds the **static Tatum RPC gateway** URL `https://<network>.gateway.tatum.io/<apiKey>` — `<network>` is the chain's `tatumRpcNetwork` from `WALLET_CHAINS` (`chains.ts`), `<apiKey>` is the SDK's Tatum key — and throws for unsupported chains. Keep this resolution in the provider; don't leak Portal token/RPC fetching into the API classes.

`EnclaveApi.request` (reached via `WalletsClient.enclaveRequest` or any enclave method) auto-injects `rpcUrl` into the body (resolved from `body.chain`/`body.chainId` via the provider) unless one is already present.

### Entry points

`src/index.ts` is the public export surface — add new public classes/types there. `TatumWalletsSdk` is the SDK class and the single entry point — construct it with `new TatumWalletsSdk(config)`. It exposes `wallets.custodian` (custodian-scoped), `wallets.initClient({ token })` (mints a client-scoped `WalletsClient`), and `wallets.api.request(...)` (escape hatch for raw Tatum calls).

## Conventions (from AGENTS.md)

- Strict TS, ESM imports **must** use `.js` extensions (`import { X } from './transport.js'`). `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are on — assign optional fields conditionally (see `buildRequestOptions`) rather than passing `undefined`.
- 2-space indent, single quotes, semicolons. `PascalCase` classes/types, `camelCase` methods/vars/operation maps.
- Public APIs avoid `any` — prefer `unknown`, generics (`<TResponse = unknown>`), or exported interfaces.
- JSDoc only where it helps consumers; no comments restating code.

## Testing

Vitest, tests in `test/*.test.ts`. Inject a fake `fetch` via the `fetch` config option and assert at the request level: HTTP method, URL + encoded path params, query params, JSON body serialization, required auth header (`x-api-key` for Tatum, `Authorization: Bearer` for Portal), and error behavior for missing path params. Add/update tests for every public behavior change.

Custodian-scoped calls first fetch the custodian token from `GET /v4/wallets/custodian-api-key`, so a fake `fetch` must route that path (see the `isCustodianKeyRequest` / `portalCallsOf` helpers in `portal.test.ts`) — the Portal request is then the _second_ call, not the first. Client-scoped calls use the token passed to `initClient` and skip that fetch.

## Publishing

ESM-only package (`type: module`, single `import` export — do **not** add a CJS build without a deliberate decision). Published tarball = `dist/*.js` + `*.d.ts` + README + LICENSE + package.json only (`src/`, tests, configs excluded via `files` + `.npmignore`).

**Pre-release gate:** `PortalTatumProvider` is now fully wired to real Tatum endpoints — the custodian token via `GET /v4/wallets/custodian-api-key`, and per-chain RPC via the static `gateway.tatum.io` URLs. No mocks remain in the provider; the earlier mock-removal blocker is satisfied.

**Releases are automated** via release-please + npm Trusted Publishers (OIDC) — see `docs/superpowers/specs/2026-06-03-npm-trusted-publishing-design.md`:

- Merging conventional commits to `master` makes release-please open/update a release PR (version bump + CHANGELOG).
- Merging that release PR tags `vX.Y.Z`, creates a GitHub Release, and the `publish` job in `.github/workflows/release.yml` publishes to npm via OIDC — no npm tokens exist. `prepublishOnly` (test + typecheck + build) is the final gate.
- Do **not** run `npm version` or `npm publish` manually, and do not edit `package.json` `version`, `CHANGELOG.md`, or `.release-please-manifest.json` by hand — release-please owns them.
- The npm Trusted Publisher is pinned to repo `tatumio/wallet-sdk` + workflow `release.yml` — renaming either breaks publishing until the npm-side config is updated.

Consumers install with `npm i @tatumio/wallet-sdk`. Verify a release: `npm view @tatumio/wallet-sdk dist-tags`.
