import { describe, it, expect } from 'vitest';
import { reconstructPrivateKey } from '../../src/eject/index.js';
import { toPaddedHexBE, toLittleEndian32 } from '../../src/eject/curves.js';
import { base58 } from '@scure/base';
import { makeShares } from './vectors.js';
import { TatumWalletsSdk } from '../../src/index.js';

describe('eject/reconstruct', () => {
  it('reconstructs a secp256k1 key as 64-char big-endian hex', async () => {
    const secret = BigInt('0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff');
    const { clientShare, custodianShare } = makeShares('SECP256K1', secret);
    const priv = await reconstructPrivateKey({ curve: 'SECP256K1', clientShare, custodianShare });
    expect(priv).toBe(toPaddedHexBE(secret));
    expect(priv).toHaveLength(64);
  });

  it('reconstructs an ed25519 key as little-endian Base58', async () => {
    const secret = 123456789012345678901234567890n;
    const { clientShare, custodianShare } = makeShares('ED25519', secret);
    const priv = await reconstructPrivateKey({ curve: 'ED25519', clientShare, custodianShare });
    expect(priv).toBe(base58.encode(toLittleEndian32(secret)));
  });

  it('accepts string and Uint8Array share inputs', async () => {
    const secret = 42n;
    const { clientShare, custodianShare } = makeShares('SECP256K1', secret);
    const asString = await reconstructPrivateKey({
      curve: 'SECP256K1',
      clientShare: JSON.stringify(clientShare),
      custodianShare: JSON.stringify(custodianShare),
    });
    const asBytes = await reconstructPrivateKey({
      curve: 'SECP256K1',
      clientShare: new TextEncoder().encode(JSON.stringify(clientShare)),
      custodianShare: new TextEncoder().encode(JSON.stringify(custodianShare)),
    });
    expect(asString).toBe(toPaddedHexBE(secret));
    expect(asBytes).toBe(toPaddedHexBE(secret));
  });

  it('throws when the derived public key does not match', async () => {
    const { clientShare, custodianShare } = makeShares('SECP256K1', 1000n);
    // Corrupt the client share value so recovery yields a different scalar.
    (clientShare as { share: string }).share = '999999';
    await expect(
      reconstructPrivateKey({ curve: 'SECP256K1', clientShare, custodianShare }),
    ).rejects.toThrow(/public key/i);
  });

  it('rejects an unsupported curve', async () => {
    const { clientShare, custodianShare } = makeShares('SECP256K1', 7n);
    await expect(
      // @ts-expect-error intentionally invalid curve
      reconstructPrivateKey({ curve: 'P256', clientShare, custodianShare }),
    ).rejects.toThrow();
  });
});

describe('WalletsClient.reconstructPrivateKey', () => {
  it('delegates to the standalone function (no network call)', async () => {
    const sdk = new TatumWalletsSdk({ apiKey: 'test-key', baseUrl: 'https://api.tatum.io' });
    const client = sdk.initClient({ token: 'test-token' });
    const secret = 555n;
    const { clientShare, custodianShare } = makeShares('SECP256K1', secret);
    const priv = await client.reconstructPrivateKey({
      curve: 'SECP256K1',
      clientShare,
      custodianShare,
    });
    expect(priv).toBe(toPaddedHexBE(secret));
  });
});
