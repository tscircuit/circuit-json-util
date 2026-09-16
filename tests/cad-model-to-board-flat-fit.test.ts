import { test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { expectModelPoint } from "./fixtures/cad-model-to-board"

test("legacy flat-axis ratio 1 caps contain enlargement and preserves fill planes", () => {
  const cad = {
    position: { x: 0, y: 0, z: 0 },
    model_unit_to_mm_scale_factor: 2,
    size: { x: 8, y: 12, z: 20 },
  }
  const nativeBounds = {
    min: { x: 0, y: 0, z: 5 },
    max: { x: 2, y: 3, z: 5 },
  }
  expectModelPoint(
    getCadModelToBoardTransform(cad, { nativeBounds }),
    [2, 3, 5],
    [4, 6, 10],
  )
  expectModelPoint(
    getCadModelToBoardTransform(
      { ...cad, model_object_fit: "fill_bounds" },
      { nativeBounds },
    ),
    [2, 3, 5],
    [8, 12, 10],
  )
  expectModelPoint(
    getCadModelToBoardTransform(
      { ...cad, size: { x: 2, y: 12, z: 20 } },
      { nativeBounds },
    ),
    [2, 3, 5],
    [2, 3, 5],
  )
  for (const fit of ["fill_bounds", "contain_within_bounds"] as const) {
    expectModelPoint(
      getCadModelToBoardTransform(
        { ...cad, model_object_fit: fit },
        { nativeBounds: { min: nativeBounds.min, max: nativeBounds.min } },
      ),
      [0, 0, 5],
      [0, 0, 10],
    )
  }
})
