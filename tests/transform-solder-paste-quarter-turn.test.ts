import { expect, test } from "bun:test"
import type { PcbSolderPasteRotatedRect } from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"

test("37 + 53 degrees produces an axis-aligned rectangle with swapped dimensions", () => {
  const paste: PcbSolderPasteRotatedRect = {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste",
    shape: "rotated_rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    ccw_rotation: 37,
  }

  // The result is at 90 degrees, even though the applied rotation is only 53.
  // Store it as an axis-aligned rectangle and swap its dimensions exactly once.
  const [result] = transformPCBElements([paste], rotateDEG(53))

  expect(result).toMatchObject({ shape: "rect", width: 2, height: 4 })
  expect(result).not.toHaveProperty("ccw_rotation")
})
