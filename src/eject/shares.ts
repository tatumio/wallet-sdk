import type { Bk } from './birkhoff.js';

export type ShareInput = string | object | Uint8Array;

export interface PublicKeyCoords {
  x: bigint;
  y: bigint;
}

export interface Peer {
  share: bigint;
  bk: Bk;
}

/** Normalize a string | Uint8Array | object DKG result into a plain record. */
export function parseShareInput(input: ShareInput): Record<string, unknown> {
  if (typeof input === 'string') return JSON.parse(input) as Record<string, unknown>;
  if (input instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(input)) as Record<string, unknown>;
  }
  if (typeof input === 'object' && input !== null) return { ...(input as Record<string, unknown>) };
  throw new Error('Invalid share format');
}

/** Read a property by lower- or upper-cased first letter (DKG results vary in case). */
function pick(obj: Record<string, unknown>, lower: string, upper: string): unknown {
  return obj[lower] !== undefined ? obj[lower] : obj[upper];
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Inputted share does not include necessary fields (${context})`);
  }
  return value as Record<string, unknown>;
}

export function validateClientShare(input: ShareInput): {
  pubkey: PublicKeyCoords;
  share: string;
  serverBkX: string;
} {
  const share = parseShareInput(input);
  const pubkeyRaw = pick(share, 'pubkey', 'Pubkey');
  const bksRaw = pick(share, 'bks', 'Bks');
  if (pubkeyRaw === undefined || share['share'] === undefined || bksRaw === undefined) {
    throw new Error('Inputted share does not include necessary fields');
  }
  const pubkeyObj = asRecord(pubkeyRaw, 'pubkey');
  const bksObj = asRecord(bksRaw, 'bks');
  const serverBk = asRecord(pick(bksObj, 'server', 'Server'), 'bks.server');
  return {
    pubkey: {
      x: BigInt(String(pick(pubkeyObj, 'x', 'X'))),
      y: BigInt(String(pick(pubkeyObj, 'y', 'Y'))),
    },
    share: String(share['share']),
    serverBkX: String(pick(serverBk, 'x', 'X')),
  };
}

export function validateCustodianShare(input: ShareInput): { share: string; clientBkX: string } {
  const backup = parseShareInput(input);
  if (backup['share'] === undefined || backup['clientBk'] === undefined) {
    throw new Error('Custodian share does not include necessary fields');
  }
  return {
    share: String(backup['share']),
    clientBkX: String(backup['clientBk']),
  };
}

/**
 * Build the two peers for recovery. Mirrors the reference cross-wiring:
 * the client peer's Birkhoff x comes from the custodian share's clientBk, and
 * the server peer's Birkhoff x comes from the client share's bks.server.x.
 */
export function setupPeers(
  client: { share: string; serverBkX: string },
  custodian: { share: string; clientBkX: string },
): [Peer, Peer] {
  const clientPeer: Peer = {
    share: BigInt(client.share),
    bk: { x: BigInt(custodian.clientBkX), rank: 0 },
  };
  const serverPeer: Peer = {
    share: BigInt(custodian.share),
    bk: { x: BigInt(client.serverBkX), rank: 0 },
  };
  return [clientPeer, serverPeer];
}
