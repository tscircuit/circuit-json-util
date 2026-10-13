import { expect, test } from "bun:test"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElement } from "../index"
import { createPaste } from "./fixtures/solder-paste"

test("transformPCBElement rotates a paste rectangle by 37 degrees", () => {
  const paste = createPaste()
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
