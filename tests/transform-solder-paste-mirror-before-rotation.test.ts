import { expect, test } from "bun:test"
import type { PcbSolderPasteRotatedRect } from "circuit-json"
import { compose, inverse, rotateDEG, scale } from "transformation-matrix"
import { transformPCBElements } from "../index"
import { createPaste } from "./fixtures/solder-paste"

test("mirror then rotate preserves paste orientation and can be reversed", () => {
  const paste: PcbSolderPasteRotatedRect = {
    ...createPaste(),
    shape: "rotated_rect",
    layer: "bottom",
    ccw_rotation: 37,
  }
  // The mirror changes 37 to -37 degrees, then rotation adds 20: -17.
  const matrix = compose(rotateDEG(20), scale(-1, 1))
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
  expect(result.ccw_rotation).toBeCloseTo(-17)

  transformPCBElements([result], inverse(matrix))
  expect(result.ccw_rotation).toBeCloseTo(37)
  expect(result).toMatchObject({ width: 4, height: 2, layer: "bottom" })
})
