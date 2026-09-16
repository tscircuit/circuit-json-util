import { test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("six native normals align to +Z with established right-handed roll", () => {
  const cases = [
    ["x+", [-5, 3, 2]],
    ["x-", [5, 3, -2]],
    ["y+", [2, -5, 3]],
    ["y-", [2, 5, -3]],
    ["z+", [2, 3, 5]],
    ["z-", [2, -3, -5]],
  ] as const
  for (const [direction, expected] of cases) {
    const matrix = getCadModelToBoardTransform(
      {
        position: { x: 0, y: 0, z: 0 },
        model_board_normal_direction: direction,
      },
      { nativeBounds },
    )
    expectModelPoint(matrix, [2, 3, 5], [...expected])
  }
})
