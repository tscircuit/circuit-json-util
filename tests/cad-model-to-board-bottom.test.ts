import { test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("bottom-side CAD orientation is applied once without thickness inference", () => {
  const matrix = getCadModelToBoardTransform(
    {
      position: { x: 1, y: 2, z: -0.8 },
      rotation: { x: 180, y: 0, z: 90 },
    },
    { nativeBounds },
  )
  expectModelPoint(matrix, [0, 0, 0], [1, 2, -0.8])
  expectModelPoint(matrix, [2, 3, 4], [-2, 0, -4.8])
})
