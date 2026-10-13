import { expect, test } from "bun:test"
import type { PcbSolderPasteRotatedRect } from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"
import { createPaste } from "./fixtures/solder-paste"

test("37 + 53 degrees produces an axis-aligned rectangle with swapped dimensions", () => {
  const paste: PcbSolderPasteRotatedRect = {
    ...createPaste(),
    shape: "rotated_rect",
    ccw_rotation: 37,
  }

  // The result is at 90 degrees, even though the applied rotation is only 53.
  // Store it as an axis-aligned rectangle and swap its dimensions exactly once.
  const [result] = transformPCBElements([paste], rotateDEG(53))

  expect(result).toMatchObject({ shape: "rect", width: 2, height: 4 })
  expect(result).not.toHaveProperty("ccw_rotation")
})
