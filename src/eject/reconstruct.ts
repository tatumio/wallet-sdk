import { secp256k1 } from '@noble/curves/secp256k1';
import { ed25519 } from '@noble/curves/ed25519';
import { base58 } from '@scure/base';
import { computeBkCoefficient } from './birkhoff.js';
import {
  FIELD_ORDER,
  mod,
  toLittleEndian32,
  toPaddedHexBE,
  type Curve,
} from './curves.js';
import {
  setupPeers,
  validateClientShare,
  validateCustodianShare,
  type Peer,
  type PublicKeyCoords,
  type ShareInput,
} from './shares.js';

const THRESHOLD = 2;

export interface ReconstructPrivateKeyParams {
  curve: Curve;
  /** Decrypted client backup share (plaintext of encryptedClientBackupShare). */
  clientShare: ShareInput;
  /** Custodian backup share, as returned by getEjectableBackupShares. */
  custodianShare: ShareInput;
}

/** secret · G, in affine coordinates, for the chosen curve. */
function derivePublicKeyPoint(curve: Curve, secret: bigint): PublicKeyCoords {
  const point =
    curve === 'SECP256K1'
      ? secp256k1.Point.BASE.multiply(secret)
      : ed25519.Point.BASE.multiply(secret);
  const { x, y } = point.toAffine();
  return { x, y };
}

/** Combine peers into the secret scalar and verify it against the expected pubkey. */
function recoverScalar(curve: Curve, expectedPubkey: PublicKeyCoords, peers: [Peer, Peer]): bigint {
  const fieldOrder = FIELD_ORDER[curve];
  const coefs = computeBkCoefficient(
    peers.map((p) => p.bk),
    THRESHOLD,
    fieldOrder,
  );
  let secret = 0n;
  for (let i = 0; i < coefs.length; i++) {
    secret = mod(secret + coefs[i]! * peers[i]!.share, fieldOrder);
  }
  const derived = derivePublicKeyPoint(curve, secret);
  if (derived.x !== expectedPubkey.x || derived.y !== expectedPubkey.y) {
    throw new Error('Derived public key does not match expected public key');
  }
  return secret;
}

/**
 * Reconstruct a wallet's full private key from its two ejectable backup shares.
 * Returns 64-char big-endian hex for SECP256K1, Base58 for ED25519. Throws on
 * malformed shares or a public-key mismatch.
 */
export async function reconstructPrivateKey(params: ReconstructPrivateKeyParams): Promise<string> {
  const { curve } = params;
  if (curve !== 'SECP256K1' && curve !== 'ED25519') {
    throw new Error(`Unsupported curve: ${String(curve)}`);
  }
  const client = validateClientShare(params.clientShare);
  const custodian = validateCustodianShare(params.custodianShare);
  const peers = setupPeers(
    { share: client.share, serverBkX: client.serverBkX },
    { share: custodian.share, clientBkX: custodian.clientBkX },
  );
  const secret = recoverScalar(curve, client.pubkey, peers);

  if (curve === 'SECP256K1') return toPaddedHexBE(secret);
  return base58.encode(toLittleEndian32(secret));
}
