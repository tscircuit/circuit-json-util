import { expect, test } from "bun:test"
import type { PcbSolderPasteRect } from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElement } from "../index"

test("transformPCBElement rotates a paste rectangle by 37 degrees", () => {
  const paste: PcbSolderPasteRect = {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste",
    pcb_smtpad_id: "pad",
    shape: "rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 4,
    height: 2,
  }
  const result = transformPCBElement(paste, rotateDEG(37))

  expect(result).toBe(paste)
  expect(result).toMatchObject({
    shape: "rotated_rect",
    width: 4,
    height: 2,
    pcb_smtpad_id: "pad",
    layer: "top",
  })
  if (result.type !== "pcb_solder_paste" || result.shape !== "rotated_rect") {
    throw new Error("Expected rotated paste rectangle")
  }
  expect(result.ccw_rotation).toBeCloseTo(37)
})
