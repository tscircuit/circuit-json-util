import { test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint, nativeBounds } from "./fixtures/cad-model-to-board"

test("units and native-axis fitting transform the nonzero origin with the body", () => {
  const cad = {
    position: { x: 103, y: 204, z: 0.8 },
    rotation: { x: 0, y: 0, z: 90 },
    model_origin_position: { x: 11, y: 21, z: 32 },
    model_unit_to_mm_scale_factor: 2,
    model_board_normal_direction: "y+" as const,
    size: { x: 12, y: 16, z: 120 },
  }
  const options = { nativeBounds, boardCenter: { x: 100, y: 200 } }
  const fill = getCadModelToBoardTransform(
    { ...cad, model_object_fit: "fill_bounds" },
    options,
  )
  expectModelPoint(fill, [11, 21, 32], [3, 4, 0.8])
  expectModelPoint(fill, [12, 22, 33], [9, 6, 4.8])
  const contain = getCadModelToBoardTransform(cad, options)
  expectModelPoint(contain, [12, 22, 33], [5, 6, 2.8])
  const unitsOnly = getCadModelToBoardTransform(
    { ...cad, size: undefined, model_unit_to_mm_scale_factor: 0.5 },
    options,
  )
  expectModelPoint(unitsOnly, [12, 22, 33], [3.5, 4.5, 1.3])
})
