import { Matrix } from './matrix.js';
import { modPow } from './curves.js';

export interface Bk {
  x: bigint;
  rank: number;
}

/** Coefficient of the differential monomial of given degree/rank evaluated at x. */
function getDiffMonomialCoeff(x: bigint, fieldOrder: bigint, degree: number, rank: number): bigint {
  if (degree < rank) return 0n;
  if (degree === 0) return 1n;
  let extra = 1n;
  for (let j = 0; j < rank; j++) extra *= BigInt(degree - j);
  const power = BigInt(degree - rank);
  const result = modPow(x, power, fieldOrder);
  return (result * extra) % fieldOrder;
}

function getLinearEquationCoefficient(
  bkX: bigint,
  fieldOrder: bigint,
  degreePoly: number,
  rank: number,
): bigint[] {
  const result: bigint[] = new Array(degreePoly + 1);
  for (let i = 0; i < result.length; i++) {
    result[i] = getDiffMonomialCoeff(bkX, fieldOrder, i, rank);
  }
  return result;
}

function linearEquationCoefficientMatrix(bks: Bk[], threshold: number, fieldOrder: bigint): Matrix {
  const degree = threshold - 1;
  const data = bks.map((bk) => getLinearEquationCoefficient(bk.x, fieldOrder, degree, bk.rank));
  return new Matrix(fieldOrder, data);
}

/** First row of the pseudoinverse — the interpolation weights that recover the secret. */
export function computeBkCoefficient(bks: Bk[], threshold: number, fieldOrder: bigint): bigint[] {
  const matrix = linearEquationCoefficientMatrix(bks, threshold, fieldOrder);
  return matrix.Pseudoinverse().GetRow(0);
}
