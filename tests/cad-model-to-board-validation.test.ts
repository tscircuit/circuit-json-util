import { expect, test } from "bun:test"
import { getCadModelToBoardTransform } from "../index"
import { nativeBounds } from "./fixtures/cad-model-to-board"

test("invalid coordinates, bounds, dimensions and unrepresentable matrices throw", () => {
  const cad = { position: { x: 0, y: 0, z: 0 } }
  for (const invalid of [NaN, Infinity, -Infinity]) {
    for (const field of [
      "position",
      "rotation",
      "model_origin_position",
    ] as const) {
      expect(() =>
        getCadModelToBoardTransform(
          { ...cad, [field]: { x: invalid, y: 0, z: 0 } },
          { nativeBounds },
        ),
      ).toThrow("finite")
    }
    expect(() =>
      getCadModelToBoardTransform(cad, {
        nativeBounds,
        boardCenter: { x: invalid, y: 0 },
      }),
    ).toThrow("boardCenter")
    expect(() =>
      getCadModelToBoardTransform(cad, {
        nativeBounds,
        boardContactPoint: { x: 0, y: 0, z: invalid },
      }),
    ).toThrow("boardContactPoint")
    expect(() =>
      getCadModelToBoardTransform(cad, {
        nativeBounds: { ...nativeBounds, min: { x: invalid, y: 0, z: 0 } },
      }),
    ).toThrow("nativeBounds.min")
  }
  for (const invalid of [0, -1, NaN, Infinity]) {
    expect(() =>
      getCadModelToBoardTransform(
        { ...cad, model_unit_to_mm_scale_factor: invalid },
        { nativeBounds },
      ),
    ).toThrow("model_unit_to_mm_scale_factor")
    expect(() =>
      getCadModelToBoardTransform(
        { ...cad, size: { x: 1, y: invalid, z: 1 } },
        { nativeBounds },
      ),
    ).toThrow("size")
  }
  expect(() =>
    getCadModelToBoardTransform(cad, {
      nativeBounds: { min: nativeBounds.max, max: nativeBounds.min },
    }),
  ).toThrow("must not exceed")
  expect(() =>
    getCadModelToBoardTransform(
      { ...cad, position: { x: Number.MAX_VALUE, y: 0, z: 0 } },
      { nativeBounds, boardCenter: { x: -Number.MAX_VALUE, y: 0 } },
    ),
  ).toThrow("transform must be finite")
  const invalidEnums = [
    ["model_board_normal_direction", "__proto__"],
    ["model_board_normal_direction", "front"],
    ["model_object_fit", "stretch"],
    ["model_origin_alignment", "bottom"],
  ] as const
  for (const [field, value] of invalidEnums) {
    // Invalid persisted JSON is not constrained by TypeScript's literal unions.
    const input = JSON.parse(JSON.stringify({ ...cad, [field]: value }))
    expect(() => getCadModelToBoardTransform(input, { nativeBounds })).toThrow()
  }
})
