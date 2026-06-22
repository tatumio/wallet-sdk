import { secp256k1 } from '@noble/curves/secp256k1';
import { ed25519 } from '@noble/curves/ed25519';
import type { Curve } from '../../src/eject/curves.js';
import { FIELD_ORDER, mod } from '../../src/eject/curves.js';

/**
 * Build a 2-of-2 Birkhoff split of `secret`:
 *   f(x) = secret + a1*x   (degree 1, rank 0)
 *   share_i = f(bk.x_i)
 * Public key = secret * G. Reconstruction must return `secret`.
 */
export function makeShares(
  curve: Curve,
  secret: bigint,
): { clientShare: object; custodianShare: object; secret: bigint } {
  const order = FIELD_ORDER[curve];
  const a1 = 0x9e3779b97f4a7c15n % order; // fixed nonzero coefficient
  const clientBkX = 3n;
  const serverBkX = 8n;
  const shareClient = mod(secret + a1 * clientBkX, order);
  const shareServer = mod(secret + a1 * serverBkX, order);

  const point =
    curve === 'SECP256K1'
      ? secp256k1.Point.BASE.multiply(secret)
      : ed25519.Point.BASE.multiply(secret);
  const { x, y } = point.toAffine();

  const clientShare = {
    pubkey: { x: x.toString(), y: y.toString() },
    share: shareClient.toString(),
    bks: { server: { x: serverBkX.toString(), rank: 0 } },
  };
  const custodianShare = {
    clientId: 'test-client',
    custodianId: 'test-custodian',
    x: x.toString(),
    y: y.toString(),
    clientBk: clientBkX.toString(),
    serverBk: serverBkX.toString(),
    share: shareServer.toString(),
  };
  return { clientShare, custodianShare, secret };
}
