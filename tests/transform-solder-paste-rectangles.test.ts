import { expect, test } from "bun:test"
import type {
  PcbSolderPasteRect,
  PcbSolderPasteRotatedRect,
} from "circuit-json"
import { compose, inverse, rotateDEG, scale } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

const createPaste = (): PcbSolderPasteRect => ({
  type: "pcb_solder_paste",
  pcb_solder_paste_id: "paste",
  pcb_smtpad_id: "pad",
  shape: "rect",
  layer: "top",
  x: 0,
  y: 0,
  width: 4,
  height: 2,
})

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

test.each([89.9, 90.1])(
  "%f degrees keeps local dimensions instead of rounding to a quarter turn",
  (angle) => {
    const [result] = transformPCBElements([createPaste()], rotateDEG(angle))

    expect(result).toMatchObject({
      shape: "rotated_rect",
      width: 4,
      height: 2,
    })
    if (
      result?.type !== "pcb_solder_paste" ||
      result.shape !== "rotated_rect"
    ) {
      throw new Error("Expected rotated paste rectangle")
    }
    expect(result.ccw_rotation).toBeCloseTo(angle)
  },
)

// Mirroring reverses the original 37-degree angle. Applying the extra
// 20-degree rotation before or after that mirror gives different results.
test.each([
  ["mirror then rotate", compose(rotateDEG(20), scale(-1, 1)), -17],
  ["rotate then mirror", compose(scale(-1, 1), rotateDEG(20)), -57],
] as const)(
  "%s preserves paste orientation and can be reversed",
  (_, matrix, expectedAngle) => {
    const paste: PcbSolderPasteRotatedRect = {
      ...createPaste(),
      shape: "rotated_rect",
      layer: "bottom",
      ccw_rotation: 37,
    }
    const [result] = transformPCBElements([paste], matrix)

    expect(result).toMatchObject({
      shape: "rotated_rect",
      width: 4,
      height: 2,
      layer: "bottom",
    })
    if (
      result?.type !== "pcb_solder_paste" ||
      result.shape !== "rotated_rect"
    ) {
      throw new Error("Expected rotated paste rectangle")
    }
    expect(result.ccw_rotation).toBeCloseTo(expectedAngle)

    transformPCBElements([result], inverse(matrix))
    expect(result.ccw_rotation).toBeCloseTo(37)
    expect(result).toMatchObject({ width: 4, height: 2, layer: "bottom" })
  },
)
