import { test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("origin fallback, explicit precedence and cardinal bottom faces stay native", () => {
  const cad = { position: { x: 1, y: 2, z: 3 } }
  const options = { nativeBounds }
  expectModelPoint(
    getCadModelToBoardTransform(
      { ...cad, anchor_alignment: "center" },
      options,
    ),
    [13, 22, 40],
    [1, 2, 3],
  )
  expectModelPoint(
    getCadModelToBoardTransform(
      { ...cad, anchor_alignment: "center", model_origin_alignment: "unknown" },
      options,
    ),
    [0, 0, 0],
    [1, 2, 3],
  )
  expectModelPoint(
    getCadModelToBoardTransform(
      {
        ...cad,
        model_origin_position: { x: 11, y: 21, z: 31 },
        model_origin_alignment: "center_of_component_on_board_surface",
      },
      options,
    ),
    [11, 21, 31],
    [1, 2, 3],
  )
  const faces = [
    ["x+", [10, 22, 40]],
    ["x-", [16, 22, 40]],
    ["y+", [13, 20, 40]],
    ["y-", [13, 24, 40]],
    ["z+", [13, 22, 30]],
    ["z-", [13, 22, 50]],
  ] as const
  for (const [normal, bottom] of faces) {
    expectModelPoint(
      getCadModelToBoardTransform(
        {
          ...cad,
          model_origin_alignment: "bottom_center_of_component",
          model_board_normal_direction: normal,
          rotation: { x: 23, y: 47, z: 81 },
        },
        options,
      ),
      [...bottom],
      [1, 2, 3],
    )
  }
})
