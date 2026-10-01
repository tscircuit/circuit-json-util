import { expect, test } from "bun:test"
import { pcb_keepout } from "circuit-json"
import { compose, rotateDEG, translate } from "transformation-matrix"
import { transformPCBElement } from "../index"

test("current-schema outline keepouts transform their boundary rather than a missing center", () => {
  const keepout = pcb_keepout.parse({
    type: "pcb_keepout",
    pcb_keepout_id: "outline_keepout",
    shape: "outline",
    layers: ["top", "bottom"],
    stroke_width: 0,
    outline: [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 1, y: 2 },
    ],
  })
  const transformed = transformPCBElement(
    keepout,
    compose(translate(10, -20), rotateDEG(90)),
  )
  if (transformed.type !== "pcb_keepout" || transformed.shape !== "outline") {
    throw new Error("Expected outline keepout geometry")
  }
  expect(transformed.outline[0]!.x).toBeCloseTo(10, 7)
  expect(transformed.outline[0]!.y).toBeCloseTo(-20, 7)
  expect(transformed.outline[1]!.x).toBeCloseTo(10, 7)
  expect(transformed.outline[1]!.y).toBeCloseTo(-17, 7)
  expect(transformed.outline[2]!.x).toBeCloseTo(8, 7)
  expect(transformed.outline[2]!.y).toBeCloseTo(-19, 7)
})
