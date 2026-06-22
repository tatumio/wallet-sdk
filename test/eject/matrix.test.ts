import { describe, it, expect } from 'vitest';
import { Matrix } from '../../src/eject/matrix.js';
import { mod } from '../../src/eject/curves.js';

const P = 97n; // small prime field for testing

describe('eject/matrix', () => {
  it('multiplies matrices mod field order', () => {
    const a = new Matrix(P, [
      [1n, 2n],
      [3n, 4n],
    ]);
    const b = new Matrix(P, [
      [5n, 6n],
      [7n, 8n],
    ]);
    const c = a.multiply(b);
    expect(c.GetRow(0)).toEqual([mod(19n, P), mod(22n, P)]);
    expect(c.GetRow(1)).toEqual([mod(43n, P), mod(50n, P)]);
  });

  it('inverts a square matrix mod field order', () => {
    const m = new Matrix(P, [
      [1n, 2n],
      [3n, 4n],
    ]);
    const inv = m.Inverse();
    const id = m.multiply(inv);
    expect(id.GetRow(0)).toEqual([1n, 0n]);
    expect(id.GetRow(1)).toEqual([0n, 1n]);
  });

  it('transposes', () => {
    const m = new Matrix(P, [[1n, 2n, 3n]]);
    const t = m.Transpose();
    expect(t.GetRow(0)).toEqual([1n]);
    expect(t.GetRow(1)).toEqual([2n]);
    expect(t.GetRow(2)).toEqual([3n]);
  });

  it('computes a pseudoinverse whose product with the original is identity on a square input', () => {
    const m = new Matrix(P, [
      [1n, 0n],
      [1n, 1n],
    ]);
    const pinv = m.Pseudoinverse();
    const id = pinv.multiply(m);
    expect(id.GetRow(0)).toEqual([1n, 0n]);
    expect(id.GetRow(1)).toEqual([0n, 1n]);
  });

  it('throws on singular inverse', () => {
    const m = new Matrix(P, [
      [2n, 4n],
      [1n, 2n],
    ]);
    expect(() => m.Inverse()).toThrow();
  });
});
