import { expect, test } from "bun:test"
import type { PcbSolderPasteRotatedRect } from "circuit-json"
import { compose, inverse, rotateDEG, scale } from "transformation-matrix"
import { transformPCBElements } from "../index"
import { createPaste } from "./fixtures/solder-paste"

test("rotate then mirror preserves paste orientation and can be reversed", () => {
  const paste: PcbSolderPasteRotatedRect = {
    ...createPaste(),
    shape: "rotated_rect",
    layer: "bottom",
    ccw_rotation: 37,
  }
  // Rotation adds 20 to 37 degrees, then the mirror reverses the angle: -57.
  const matrix = compose(scale(-1, 1), rotateDEG(20))
  const [result] = transformPCBElements([paste], matrix)

  expect(result).toMatchObject({
    shape: "rotated_rect",
    width: 4,
    height: 2,
    layer: "bottom",
  })
  if (result?.type !== "pcb_solder_paste" || result.shape !== "rotated_rect") {
    throw new Error("Expected rotated paste rectangle")
  }
  expect(result.ccw_rotation).toBeCloseTo(-57)

  transformPCBElements([result], inverse(matrix))
  expect(result.ccw_rotation).toBeCloseTo(37)
  expect(result).toMatchObject({ width: 4, height: 2, layer: "bottom" })
})
