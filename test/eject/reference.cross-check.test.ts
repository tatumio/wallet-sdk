import { describe, it, expect } from 'vitest';
import { reconstructPrivateKey } from '../../src/eject/index.js';
import { makeShares } from './vectors.js';

/**
 * Golden vectors captured once from the reference implementation
 * (@portal-hq/eject-js v1.0.2) for the deterministic share pairs produced by
 * `makeShares`. The reference package is intentionally NOT a dependency; these
 * frozen literals preserve cross-implementation validation without it. If the
 * port ever diverges from the reference, these assertions fail.
 */
const GOLDEN = {
  SECP256K1: {
    secret: BigInt('0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'),
    privateKey: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  },
  ED25519: {
    secret: 123456789012345678901234567890n,
    privateKey: '1111111111111111111JVh57DUrHZQ1BjG5Wg',
  },
} as const;

describe('reference golden vectors (@portal-hq/eject-js)', () => {
  it('matches the reference secp256k1 output', async () => {
    const { clientShare, custodianShare } = makeShares('SECP256K1', GOLDEN.SECP256K1.secret);
    const priv = await reconstructPrivateKey({ curve: 'SECP256K1', clientShare, custodianShare });
    expect(priv).toBe(GOLDEN.SECP256K1.privateKey);
  });

  it('matches the reference ed25519 output (Base58)', async () => {
    const { clientShare, custodianShare } = makeShares('ED25519', GOLDEN.ED25519.secret);
    const priv = await reconstructPrivateKey({ curve: 'ED25519', clientShare, custodianShare });
    expect(priv).toBe(GOLDEN.ED25519.privateKey);
  });
});
