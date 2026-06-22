import type { Curve } from '../portal/types/index.js';

export type { Curve };

/** Group orders for the supported curves (the modulus for share arithmetic). */
export const FIELD_ORDER: Record<Curve, bigint> = {
  SECP256K1: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
  ED25519: BigInt('0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed'),
};

/** Always-non-negative remainder. */
export function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

/** Modular exponentiation x^n mod m. */
export function modPow(x: bigint, n: bigint, m: bigint): bigint {
  if (m === 1n) return 0n;
  let result = 1n;
  let base = x % m;
  let exp = n;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % m;
    exp /= 2n;
    base = (base * base) % m;
  }
  return result;
}

/** Modular inverse via the extended Euclidean algorithm. Throws if none exists. */
export function modInverse(a: bigint, m: bigint): bigint {
  const aa = mod(a, m);
  if (aa === 0n) throw new Error('Modular inverse does not exist');
  let [oldR, r] = [aa, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) throw new Error('Modular inverse does not exist');
  return mod(oldS, m);
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** Minimal big-endian byte representation of a non-negative bigint. */
export function bigIntToBytesBE(value: bigint): Uint8Array {
  let hex = value.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** 32-byte big-endian hex string (left-padded). */
export function toPaddedHexBE(value: bigint): string {
  const bytes = bigIntToBytesBE(value);
  if (bytes.length > 32) throw new Error('Private key is longer than 32 bytes');
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return bytesToHex(padded);
}

/**
 * Reverse the minimal big-endian bytes of `value` into a 32-byte buffer,
 * right-aligned (zero-padded at the front). This matches @portal-hq/eject-js's
 * ed25519 output exactly — including its treatment of scalars with leading
 * zero bytes — so reconstructed keys are byte-identical to the reference.
 * Note: this is NOT a plain left-aligned little-endian encoding.
 */
export function toLittleEndian32(value: bigint): Uint8Array {
  const bytes = bigIntToBytesBE(value);
  if (bytes.length > 32) throw new Error('Private key is longer than 32 bytes');
  const reversed = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    reversed[32 - 1 - i] = bytes[i]!;
  }
  return reversed;
}
