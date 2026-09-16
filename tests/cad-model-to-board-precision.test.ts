import { expect, test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("large board offsets are removed before small model offsets and serialization", () => {
  const boardCenter = { x: 2 ** 45, y: -(2 ** 45) }
  const cad = {
    position: { x: boardCenter.x + 2, y: boardCenter.y + 3, z: 0.8 },
    model_origin_position: { x: 0.123456789, y: 0.234567891, z: 0.345678912 },
  }
  const input = JSON.stringify({ cad, nativeBounds, boardCenter })
  const matrix = getCadModelToBoardTransform(cad, { nativeBounds, boardCenter })
  expect(Array.isArray(matrix)).toBe(true)
  expect(matrix).toHaveLength(16)
  expect([matrix[3], matrix[7], matrix[11], matrix[15]]).toEqual([0, 0, 0, 1])
  expect(JSON.parse(JSON.stringify(matrix))).toEqual(matrix)
  expectModelPoint(matrix, [0, 0, 0], [1.876543211, 2.765432109, 0.454321088])
  expectModelPoint(matrix, [0.123456789, 0.234567891, 0.345678912], [2, 3, 0.8])
  expect(JSON.stringify({ cad, nativeBounds, boardCenter })).toBe(input)
})
