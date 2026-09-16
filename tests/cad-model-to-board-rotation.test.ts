import { test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("CAD rotation is intrinsic XYZ degrees, after model-normal alignment", () => {
  const matrix = getCadModelToBoardTransform(
    {
      position: { x: 10, y: 20, z: 30 },
      rotation: { x: 90, y: 0, z: 90 },
      model_board_normal_direction: "y+",
    },
    { nativeBounds },
  )
  // Normal: (1, -3, 2); intrinsic XYZ: Rz then Rx -> (3, -2, 1).
  expectModelPoint(matrix, [1, 2, 3], [13, 18, 31])
})
