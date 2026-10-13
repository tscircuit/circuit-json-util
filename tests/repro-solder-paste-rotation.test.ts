import { expect, test } from "bun:test"
import type { PcbSolderPasteRotatedRect } from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"

test("extracting a 37-degree paste aperture into component-local coordinates removes its rotation", () => {
  const aperture: PcbSolderPasteRotatedRect = {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste1",
    shape: "rotated_rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    ccw_rotation: 37,
  }

  const [localAperture] = transformPCBElements([aperture], rotateDEG(-37))
  if (
    localAperture?.type !== "pcb_solder_paste" ||
    (localAperture.shape !== "rect" && localAperture.shape !== "rotated_rect")
  ) {
    throw new Error("Expected a rectangular paste aperture")
  }
  expect(localAperture).toMatchObject({ x: 0, y: 0, width: 4, height: 2 })
  const rotation =
    localAperture.shape === "rotated_rect" ? localAperture.ccw_rotation : 0
  expect(rotation).toBeCloseTo(0, 7)
})
