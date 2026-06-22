import { describe, it, expect } from 'vitest';
import {
  parseShareInput,
  validateClientShare,
  validateCustodianShare,
  setupPeers,
} from '../../src/eject/shares.js';

const clientShare = {
  pubkey: { X: '11', Y: '22' }, // upper-case to test normalization
  share: '5',
  bks: { server: { X: '8', Rank: 0 } },
};

const custodianShare = {
  clientId: 'c1',
  custodianId: 'cust1',
  x: '11',
  y: '22',
  clientBk: '3',
  serverBk: '8',
  share: '7',
};

describe('eject/shares', () => {
  it('parses JSON string, object, and Uint8Array uniformly', () => {
    const obj = { a: 1 };
    expect(parseShareInput(JSON.stringify(obj))).toEqual(obj);
    expect(parseShareInput(obj)).toEqual(obj);
    expect(parseShareInput(new TextEncoder().encode(JSON.stringify(obj)))).toEqual(obj);
  });

  it('validates and normalizes a client share (case-insensitive)', () => {
    const v = validateClientShare(clientShare);
    expect(v.pubkey).toEqual({ x: 11n, y: 22n });
    expect(v.share).toBe('5');
    expect(v.serverBkX).toBe('8');
  });

  it('throws when the client share is missing required fields', () => {
    expect(() => validateClientShare({ share: '5' })).toThrow(/necessary fields/i);
  });

  it('extracts the custodian share + client Birkhoff x', () => {
    const v = validateCustodianShare(custodianShare);
    expect(v.share).toBe('7');
    expect(v.clientBkX).toBe('3');
  });

  it('cross-wires peers: client bk.x from custodian.clientBk, server bk.x from client.serverBk', () => {
    const [clientPeer, serverPeer] = setupPeers(
      { share: '5', serverBkX: '8' },
      { share: '7', clientBkX: '3' },
    );
    expect(clientPeer).toEqual({ share: 5n, bk: { x: 3n, rank: 0 } });
    expect(serverPeer).toEqual({ share: 7n, bk: { x: 8n, rank: 0 } });
  });
});
