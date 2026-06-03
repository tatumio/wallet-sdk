# npm Trusted Publishing CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automated npm publishing of `@tatumio/wallet-sdk` from GitHub Actions via npm Trusted Publishers (OIDC), gated by release-please release PRs.

**Architecture:** Two workflows. `ci.yml` runs test/typecheck/build on PRs and master pushes. `release.yml` runs release-please on master pushes; when a release PR merges it tags + creates a GitHub Release, and a conditional `publish` job in the same workflow publishes to npm via OIDC (no token secrets). Release-please runs in manifest mode bootstrapped at version `0.0.2` because the repo has no tags.

**Tech Stack:** GitHub Actions, `googleapis/release-please-action@v4`, npm Trusted Publishers (requires npm CLI ≥ 11.5.1 → Node 24 in publish job), Vitest/tsc via existing npm scripts.

**Spec:** `docs/superpowers/specs/2026-06-03-npm-trusted-publishing-design.md`

**Note on testing:** This plan creates CI config, not application code — TDD does not apply. Each task's "test" is a parse/lint verification command plus the final live verification task. Conventional Commit messages required (release-please reads them).

---

### Task 1: Fix git remote to canonical repo name

The canonical GitHub repo is `tatumio/wallet-sdk`; the local remote points to `tatumio/wallets-sdk`. `package.json` `repository.url` is already correct — only the remote needs fixing.

**Files:** none (git config only)

- [ ] **Step 1: Update the remote URL**

```bash
git remote set-url origin git@github.com:tatumio/wallet-sdk.git
```

- [ ] **Step 2: Verify remote and that the repo exists on GitHub**

Run: `git remote -v && git ls-remote --heads origin | head -5`
Expected: both fetch/push show `git@github.com:tatumio/wallet-sdk.git`; `ls-remote` lists at least one branch ref.

**If `ls-remote` fails with "Repository not found":** the GitHub repo has not been renamed/created yet. STOP and report to the user — the rename on GitHub is a manual prerequisite. (GitHub redirects renamed repos, so if it was renamed from `wallets-sdk`, this works either way.)

No commit for this task (nothing in the working tree changed).

---

### Task 2: Release-please bootstrap files

The repo has no git tags, so release-please needs explicit manifest-mode bootstrap state pinned at the current published version `0.0.2`.

**Files:**
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

- [ ] **Step 1: Create `release-please-config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "node"
    }
  }
}
```

- [ ] **Step 2: Create `.release-please-manifest.json`**

```json
{
  ".": "0.0.2"
}
```

- [ ] **Step 3: Verify both files parse as JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('release-please-config.json','utf8')); JSON.parse(require('fs').readFileSync('.release-please-manifest.json','utf8')); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add release-please-config.json .release-please-manifest.json
git commit -m "chore: bootstrap release-please manifest at 0.0.2"
```

---

### Task 3: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - master

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
```

- [ ] **Step 2: Verify YAML parses**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add test/typecheck/build workflow for PRs and master"
```

---

### Task 4: Release + publish workflow

The publish job runs in the **same workflow** as release-please (conditional on `release_created`) because releases created with the default `GITHUB_TOKEN` do not trigger `on: release` workflows. The npm Trusted Publisher will be pinned to this filename: `release.yml`.

Key details:
- `id-token: write` on the publish job enables OIDC.
- Node 24 ships npm ≥ 11.5.1, required for trusted publishing. No `NODE_AUTH_TOKEN` anywhere.
- `npm publish` triggers `prepublishOnly` (`npm test && npm run typecheck && npm run build`) as the final gate.
- Top-level permissions are restricted; each job declares its own.

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches:
      - master

permissions: {}

jobs:
  release-please:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
          target-branch: master

  publish:
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created == 'true' }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm publish
```

- [ ] **Step 2: Verify YAML parses**

Run: `npx --yes js-yaml .github/workflows/release.yml > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release-please + OIDC npm publish workflow"
```

---

### Task 5: Update CLAUDE.md

CLAUDE.md is stale (claims branch `main` with no commits; documents a manual `npm version`/`npm publish` flow). Update it to match reality and the new release process.

**Files:**
- Modify: `CLAUDE.md` (the "## Commands" git note and the entire "## Publishing" section)

- [ ] **Step 1: Fix the branch note in "## Commands"**

Replace:

```markdown
This folder is a git repo on `main` with **no commits yet** — everything is untracked/staged initial work. Use Conventional Commit messages (`feat:`, `fix:`, `test:`) when asked to commit.
```

with:

```markdown
This folder is a git repo on `master` (also the default/PR branch). Conventional Commit messages (`feat:`, `fix:`, `test:`) are **required** — release-please derives versions and the changelog from them.
```

- [ ] **Step 2: Replace the release commands in "## Publishing"**

In the "## Publishing" section, keep the first paragraph (ESM-only package, tarball contents) and the pre-release-gate paragraph, but replace the "**First release ships as stable…**" paragraph, the ```sh code block```, and the trailing "Consumers install…" line with:

```markdown
**Releases are automated** via release-please + npm Trusted Publishers (OIDC) — see `docs/superpowers/specs/2026-06-03-npm-trusted-publishing-design.md`:

- Merging conventional commits to `master` makes release-please open/update a release PR (version bump + CHANGELOG).
- Merging that release PR tags `vX.Y.Z`, creates a GitHub Release, and the `publish` job in `.github/workflows/release.yml` publishes to npm via OIDC — no npm tokens exist. `prepublishOnly` (test + typecheck + build) is the final gate.
- Do **not** run `npm version` or `npm publish` manually, and do not edit `package.json` `version`, `CHANGELOG.md`, or `.release-please-manifest.json` by hand — release-please owns them.
- The npm Trusted Publisher is pinned to repo `tatumio/wallet-sdk` + workflow `release.yml` — renaming either breaks publishing until the npm-side config is updated.

Consumers install with `npm i @tatumio/wallet-sdk`. Verify a release: `npm view @tatumio/wallet-sdk dist-tags`.
```

- [ ] **Step 3: Verify no stale references remain**

Run: `grep -n "no commits\|npm version 0.1.0\|npm publish  *#" CLAUDE.md || echo OK`
Expected: `OK` (no matches)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for automated release process"
```

---

### Task 6: Push and configure external services (partially manual)

**Files:** none

- [ ] **Step 1: Push to master** (ask the user before pushing if not already authorized)

```bash
git push origin master
```

- [ ] **Step 2: Verify CI + release workflows ran**

Run: `gh run list --repo tatumio/wallet-sdk --limit 4`
Expected: a `CI` run and a `Release` run for the pushed commit, both `completed`/`success`. The Release run's `release-please` job should open a release PR (e.g. `chore(master): release 0.1.0` — exact version depends on commit types since 0.0.2); the `publish` job is skipped (no release created yet).

- [ ] **Step 3: Manual — npm Trusted Publisher config (user does this, needs npm package admin)**

Present this checklist to the user:

1. npmjs.com → `@tatumio/wallet-sdk` → Settings → Trusted Publisher:
   - Publisher: **GitHub Actions**
   - Organization: `tatumio`
   - Repository: `wallet-sdk`
   - Workflow filename: `release.yml`
   - Environment: leave blank
2. Same page: set publishing access to **Require trusted publisher** (disables token-based publishing).

- [ ] **Step 4: Manual — GitHub repo settings (user does this, needs repo admin)**

Present to the user: GitHub → `tatumio/wallet-sdk` → Settings → Actions → General → enable **"Allow GitHub Actions to create and approve pull requests"**. Without this, release-please cannot open the release PR.

- [ ] **Step 5: Live end-to-end verification (after the user merges the first release PR)**

```bash
npm view @tatumio/wallet-sdk dist-tags
```
Expected: `latest` shows the new version (e.g. `0.1.0`).

Then check the npm package page shows the provenance badge, and optionally in a scratch dir:

```bash
mkdir -p /tmp/wsdk-check && cd /tmp/wsdk-check && npm init -y >/dev/null && npm i @tatumio/wallet-sdk >/dev/null && npm audit signatures
```
Expected: `audited 1 package` with `1 package has a verified registry signature` (and provenance attestation counted).

**Failure recovery (from spec):**
- `publish` job fails on `prepublishOnly`: tag + GitHub Release exist but npm publish didn't happen — fix on master, re-run the failed job.
- OIDC rejected: org/repo/workflow-filename mismatch between npm Trusted Publisher config and the run — fix the npm-side values from Step 3.
