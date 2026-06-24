# AGENTS.md

Guidance for AI coding agents working in this repository.

## Overview

TypeScript ESM SDK for **Tatum MPC wallets** — create wallets, sign and send transactions, back up and recover keys, and manage end-user clients. Two scopes: **custodian/`api`** (backend-only — require a Tatum `apiKey` and throw without one) and **`initClient`** (client-side — authenticates with a client token, needs no `apiKey`, safe in a browser). `apiKey` is therefore **optional** on `WalletsSDKConfig`. Chain enclave operations (`sign`/`sendAssets`) require the caller to pass an explicit `rpcUrl` (the SDK injects nothing). The SDK class and single entry point is `TatumWalletsSdk` (`src/sdk.ts`); the public export surface is `src/index.ts`. Consumer documentation lives in `README.md` and `docs/USAGE.md`.

## Commands

- `npm test` — run Vitest suite once. `npm run test:watch` for watch mode.
- Run a single test file: `npx vitest run test/portal.test.ts`. Filter by name: `npx vitest run -t 'sends JSON requests'`.
- `npm run typecheck` — `tsc --noEmit` (type-checks `src` + `test` via `tsconfig.json`).
- `npm run build` — compile `src/` → `dist/` via `tsconfig.build.json` (excludes `test`).
- `npm run clean` — remove `dist/` and `coverage/`.
- Verify package contents without publishing: `npm --cache ./.npm-cache pack --dry-run`.

## Code style

- Strict TS, ESM imports **must** use `.js` extensions (`import { X } from './transport.js'`). `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are on — assign optional fields conditionally rather than passing `undefined`.
- 2-space indent, single quotes, semicolons. `PascalCase` classes/types, `camelCase` methods/vars.
- Public APIs avoid `any` — prefer `unknown`, generics (`<TResponse = unknown>`), or exported interfaces.
- JSDoc only where it helps consumers; no comments restating code.

## Commits & releases

- This folder is a git repo on `master` (also the default/PR branch). Conventional Commit messages (`feat:`, `fix:`, `test:`) are **required** — release-please derives versions and the changelog from them.
- **Releases are automated** via release-please + npm Trusted Publishers (OIDC): merging conventional commits to `master` opens/updates a release PR (version bump + CHANGELOG); merging that PR tags `vX.Y.Z`, creates a GitHub Release, and publishes to npm via OIDC.
- Do **not** run `npm version` or `npm publish` manually, and do not hand-edit `package.json` `version`, `CHANGELOG.md`, or `.release-please-manifest.json` — release-please owns them.

## Testing & validation

- Vitest, tests in `test/*.test.ts`. Inject a fake `fetch` via the `fetch` config option and assert at the request level: HTTP method, URL + encoded path params, query params, JSON body serialization, required auth header, and error behavior for missing path params. Add/update tests for every public behavior change.
- `prepublishOnly` gates publish on `npm test && npm run typecheck && npm run build`. Run all three before handing off changes.
- ESM-only package (`type: module`, single `import` export — do **not** add a CJS build without a deliberate decision). Published tarball = `dist/*.js` + `*.d.ts` + README + LICENSE + package.json only (`src/`, tests, configs excluded via `files` + `.npmignore`).
