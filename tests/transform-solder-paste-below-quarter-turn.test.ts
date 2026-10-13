import { expect, test } from "bun:test"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"
import { createPaste } from "./fixtures/solder-paste"

test("89.9 degrees keeps local dimensions instead of rounding to a quarter turn", () => {
  const [result] = transformPCBElements([createPaste()], rotateDEG(89.9))

  expect(result).toMatchObject({
    shape: "rotated_rect",
    width: 4,
    height: 2,
  })
  if (result?.type !== "pcb_solder_paste" || result.shape !== "rotated_rect") {
    throw new Error("Expected rotated paste rectangle")
  }
  expect(result.ccw_rotation).toBeCloseTo(89.9)
})
