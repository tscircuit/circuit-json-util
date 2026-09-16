import { expect, test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("measured off-center contact datum is used instead of the envelope center", () => {
  const cad = {
    position: { x: 2, y: 3, z: 0.8 },
    model_origin_alignment: "center_of_component_on_board_surface" as const,
    model_board_normal_direction: "y+" as const,
    model_unit_to_mm_scale_factor: 2,
  }
  expect(() => getCadModelToBoardTransform(cad, { nativeBounds })).toThrow(
    "requires a measured boardContactPoint",
  )
  const matrix = getCadModelToBoardTransform(cad, {
    nativeBounds,
    boardContactPoint: { x: 12, y: 20, z: 39 },
  })
  expectModelPoint(matrix, [12, 20, 39], [2, 3, 0.8])
  expectModelPoint(matrix, [13, 22, 40], [4, 1, 4.8])
})
