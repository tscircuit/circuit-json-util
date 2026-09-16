import { expect } from "bun:test"
import { vec3 } from "gl-matrix"
import type { CadModelBounds } from "../../index"

export const nativeBounds: CadModelBounds = {
  min: { x: 10, y: 20, z: 30 },
  max: { x: 16, y: 24, z: 50 },
}

export function expectModelPoint(
  matrix: number[],
  point: [number, number, number],
  expected: [number, number, number],
) {
  const actual = vec3.transformMat4(new Float64Array(3), point, matrix)
  expected.forEach((value, axis) => {
    expect(actual[axis]).toBeCloseTo(value, 10)
  })
}
