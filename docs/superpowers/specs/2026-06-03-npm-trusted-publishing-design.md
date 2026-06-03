# Automated npm Publishing via Trusted Publishers — Design

**Date:** 2026-06-03
**Status:** Approved
**Package:** `@tatumio/wallet-sdk` (exists on npm; latest `0.0.2`)
**Repo:** `tatumio/wallet-sdk` (canonical name; local remote currently points to `wallets-sdk` and must be fixed)

## Goal

Publish the SDK to npm from GitHub Actions using npm Trusted Publishers (OIDC) — no long-lived `NPM_TOKEN` secrets — with a release-PR workflow driven by release-please.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Trigger model | Release-PR bot | Human gate = PR merge; best audit trail; no manual version bumps |
| Release tool | release-please | Repo already uses conventional commits; single-package sweet spot |
| Publish auth | npm Trusted Publisher (OIDC) | No token secrets; provenance attached automatically |
| Extra environment gate | None | Release PR merge is sufficient human gate; avoids approval fatigue |
| CI checks workflow | Yes | `test` + `typecheck` + `build` on PRs and master pushes for early feedback |
| Workflow filename | `release.yml` | Vendor-neutral name pinned in npm Trusted Publisher config; tool choice stays an implementation detail |

## Flow

```
push to master ──▶ release-please job
                     ├─ no release → opens/updates "chore: release X.Y.Z" PR
                     └─ release PR merged → tags vX.Y.Z + GitHub Release
                          └─▶ publish job (same workflow, if release_created)
                                └─ npm publish via OIDC → provenance attached
```

**Constraint:** the publish step runs as a conditional job in the *same* workflow as release-please, not a separate `on: release` workflow. Releases created with the default `GITHUB_TOKEN` do not fire `release: published` triggers (GitHub anti-recursion rule); a same-workflow job avoids needing a PAT.

## Components

### `.github/workflows/ci.yml`

- Triggers: `pull_request`, `push` to `master`.
- Single job, Node 22: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`.

### `.github/workflows/release.yml`

- Trigger: `push` to `master`.
- Job `release-please`:
  - `googleapis/release-please-action@v4`, `release-type: node`, target branch `master`.
  - Permissions: `contents: write`, `pull-requests: write`.
  - Outputs `release_created` (and tag info) consumed by the publish job.
- Job `publish`:
  - `if: needs.release-please.outputs.release_created`.
  - Permissions: `id-token: write`, `contents: read`.
  - Steps: checkout, `actions/setup-node` with Node 24 and `registry-url: https://registry.npmjs.org` (npm ≥ 11.5.1 required for OIDC publish), `npm ci`, `npm publish`.
  - No `NODE_AUTH_TOKEN` or other npm credentials anywhere.
  - `prepublishOnly` (`npm test && npm run typecheck && npm run build`) runs as the final gate inside `npm publish`.

### Release-please bootstrap files

No git tags exist yet, so release-please needs explicit bootstrap state:

- `.release-please-manifest.json` → `{ ".": "0.0.2" }`
- `release-please-config.json` → minimal config for a single node package.

## One-time manual setup (outside the repo)

1. npmjs.com → `@tatumio/wallet-sdk` → Settings → Trusted Publisher:
   - Publisher: GitHub Actions
   - Organization: `tatumio`
   - Repository: `wallet-sdk`
   - Workflow filename: `release.yml`
   - Environment: (blank)
   - Requires maintainer/admin rights on the package.
2. Same settings page: set publishing access to **Require trusted publisher** — disables token-based publishing entirely.
3. GitHub repo Settings → Actions → General → enable **Allow GitHub Actions to create and approve pull requests** (release-please needs this to open release PRs).

## Repo fixes included in implementation

- `git remote set-url origin git@github.com:tatumio/wallet-sdk.git` (canonical repo is `wallet-sdk`; `package.json` `repository.url` already correct).
- Update CLAUDE.md: it currently claims the repo is on `main` with no commits — actual state is `master` with history. Also document the new release process.

## Versioning behavior

- Current version: `0.0.2`.
- Next `feat:` commits → release-please proposes `0.1.0` (matches the existing plan that the first release ships as `0.1.0` stable under `latest`).
- `fix:` commits alone → `0.0.3`.
- CHANGELOG.md is generated and maintained by release-please from conventional commits.

## Failure modes and recovery

- **`prepublishOnly` fails in the publish job:** the tag and GitHub Release exist but nothing was published to npm. Recovery: fix the issue on master, re-run the failed publish job (re-running the same workflow keeps OIDC validity since the workflow file is unchanged).
- **OIDC publish rejected:** almost always an org/repo/workflow-filename mismatch between the npm Trusted Publisher config and the actual workflow run. The npm error message names the expected values; fix the npm-side config.
- **Release PR not created:** check that "Allow GitHub Actions to create and approve pull requests" is enabled and that commits follow conventional-commit format.

## Verification

After the first release PR merges:

1. `npm view @tatumio/wallet-sdk dist-tags` shows the new version under `latest`.
2. The npm package page shows the provenance badge.
3. `npm audit signatures` in a consumer project passes for the package.
