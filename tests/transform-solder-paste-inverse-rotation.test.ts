import { expect, test } from "bun:test"
import type { PcbSolderPasteRotatedRect } from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"
import { createPaste } from "./fixtures/solder-paste"

test("extracting a 37-degree paste aperture into component-local coordinates removes its rotation", () => {
  const paste: PcbSolderPasteRotatedRect = {
    ...createPaste(),
    shape: "rotated_rect",
    ccw_rotation: 37,
  }
  const [localAperture] = transformPCBElements([paste], rotateDEG(-37))
  if (
    localAperture?.type !== "pcb_solder_paste" ||
    (localAperture.shape !== "rect" && localAperture.shape !== "rotated_rect")
  ) {
    throw new Error("Expected a rectangular paste aperture")
  }
  expect(localAperture).toMatchObject({ x: 0, y: 0, width: 4, height: 2 })
  let rotation = 0
  if (localAperture.shape === "rotated_rect") {
    rotation = localAperture.ccw_rotation
  }
  expect(rotation).toBeCloseTo(0, 7)
})
