import { describe, it, expect } from 'vitest';
import {
  FIELD_ORDER,
  mod,
  modPow,
  modInverse,
  bytesToHex,
  toPaddedHexBE,
  toLittleEndian32,
} from '../../src/eject/curves.js';

describe('eject/curves', () => {
  it('exposes secp256k1 and ed25519 group orders', () => {
    expect(FIELD_ORDER.SECP256K1).toBe(
      BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
    );
    expect(FIELD_ORDER.ED25519).toBe(
      BigInt('0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed'),
    );
  });

  it('mod returns a non-negative residue', () => {
    expect(mod(-1n, 7n)).toBe(6n);
    expect(mod(8n, 7n)).toBe(1n);
  });

  it('modPow computes modular exponentiation', () => {
    expect(modPow(2n, 10n, 1000n)).toBe(24n); // 1024 % 1000
    expect(modPow(5n, 0n, 7n)).toBe(1n);
  });

  it('modInverse satisfies a * inv === 1 (mod m)', () => {
    const m = 97n;
    const inv = modInverse(40n, m);
    expect(mod(40n * inv, m)).toBe(1n);
  });

  it('toPaddedHexBE left-pads to 64 hex chars', () => {
    expect(toPaddedHexBE(1n)).toBe('00'.repeat(31) + '01');
    expect(toPaddedHexBE(255n)).toHaveLength(64);
  });

  it('toLittleEndian32 reverses minimal BE bytes right-aligned into 32 bytes (reference layout)', () => {
    const le = toLittleEndian32(1n);
    expect(le).toHaveLength(32);
    expect(le[0]).toBe(0);
    expect(le[31]).toBe(1);

    // 0x0102 → LSB(0x02) then MSB(0x01) in the tail, MSB at the final byte.
    const two = toLittleEndian32(0x0102n);
    expect(two[30]).toBe(0x02);
    expect(two[31]).toBe(0x01);
  });

  it('bytesToHex round-trips', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 255]))).toBe('0001ff');
  });
});
