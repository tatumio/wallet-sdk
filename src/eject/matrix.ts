import { mod, modInverse } from './curves.js';

/** Dense matrix over the integers mod `fieldOrder`. Ported from @portal-hq/eject-js. */
export class Matrix {
  readonly fieldOrder: bigint;
  data: bigint[][];
  rows: number;
  cols: number;

  constructor(fieldOrder: bigint, data: bigint[][]) {
    this.fieldOrder = fieldOrder;
    this.data = data;
    this.rows = data.length;
    this.cols = data[0]?.length ?? 0;
  }

  Copy(): Matrix {
    return new Matrix(
      this.fieldOrder,
      this.data.map((row) => [...row]),
    );
  }

  Transpose(): Matrix {
    const newData: bigint[][] = Array.from({ length: this.cols }, () =>
      Array.from({ length: this.rows }, () => 0n),
    );
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        newData[j]![i] = this.data[i]![j]!;
      }
    }
    this.data = newData;
    [this.rows, this.cols] = [this.cols, this.rows];
    return this;
  }

  multiply(other: Matrix): Matrix {
    if (this.cols !== other.rows) {
      throw new Error("Matrix dimensions don't match for multiplication");
    }
    const result: bigint[][] = Array.from({ length: this.rows }, () =>
      Array.from({ length: other.cols }, () => 0n),
    );
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let acc = 0n;
        for (let k = 0; k < this.cols; k++) {
          acc = (acc + this.data[i]![k]! * other.data[k]![j]!) % this.fieldOrder;
        }
        result[i]![j] = acc;
      }
    }
    return new Matrix(this.fieldOrder, result);
  }

  Inverse(): Matrix {
    if (this.rows !== this.cols) throw new Error('Only square matrices can be inverted');
    const n = this.rows;
    const aug: bigint[][] = Array.from({ length: n }, () =>
      Array.from({ length: 2 * n }, () => 0n),
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) aug[i]![j] = this.data[i]![j]!;
      aug[i]![i + n] = 1n;
    }
    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let j = i + 1; j < n; j++) {
        if (aug[j]![i] !== 0n) {
          pivotRow = j;
          break;
        }
      }
      if (aug[pivotRow]![i] === 0n) throw new Error('Matrix is singular and cannot be inverted');
      if (pivotRow !== i) [aug[i], aug[pivotRow]] = [aug[pivotRow]!, aug[i]!];
      const pivotInv = modInverse(aug[i]![i]!, this.fieldOrder);
      for (let j = 0; j < 2 * n; j++) {
        aug[i]![j] = (aug[i]![j]! * pivotInv) % this.fieldOrder;
      }
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const factor = aug[j]![i]!;
        for (let k = 0; k < 2 * n; k++) {
          aug[j]![k] = mod(aug[j]![k]! - factor * aug[i]![k]!, this.fieldOrder);
        }
      }
    }
    const inverse: bigint[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0n),
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) inverse[i]![j] = aug[i]![j + n]!;
    }
    return new Matrix(this.fieldOrder, inverse);
  }

  modulus(): Matrix {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.data[i]![j] = mod(this.data[i]![j]!, this.fieldOrder);
      }
    }
    return this;
  }

  GetRow(index: number): bigint[] {
    if (index < 0 || index >= this.rows) throw new Error('Row index out of bounds');
    return [...this.data[index]!];
  }

  /** (MᵀM)⁻¹Mᵀ — left pseudoinverse, reduced mod field order. */
  Pseudoinverse(): Matrix {
    const copy = this.Copy();
    const copyTranspose = this.Copy().Transpose();
    const symmetric = copyTranspose.multiply(copy);
    const inverseSymmetric = symmetric.Inverse();
    const result = inverseSymmetric.multiply(copyTranspose);
    result.modulus();
    return result;
  }
}
