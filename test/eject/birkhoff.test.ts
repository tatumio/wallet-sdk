import { describe, it, expect } from 'vitest';
import { computeBkCoefficient } from '../../src/eject/birkhoff.js';
import { mod } from '../../src/eject/curves.js';

const P = 2_147_483_647n; // Mersenne prime (2^31 - 1) field for testing

describe('eject/birkhoff', () => {
  it('recovers Lagrange weights for a rank-0 degree-1 (2-of-2) split', () => {
    // f(x) = a0 + a1*x. Shares s_i = f(x_i). Secret a0 = sum(coef_i * s_i).
    const a0 = 12345n;
    const a1 = 67890n;
    const x1 = 3n;
    const x2 = 8n;
    const s1 = mod(a0 + a1 * x1, P);
    const s2 = mod(a0 + a1 * x2, P);

    const coefs = computeBkCoefficient(
      [
        { x: x1, rank: 0 },
        { x: x2, rank: 0 },
      ],
      2,
      P,
    );

    const recovered = mod(coefs[0]! * s1 + coefs[1]! * s2, P);
    expect(recovered).toBe(a0);
  });
});
