import { expect, test } from "bun:test"
import { pcb_cutout_rect } from "circuit-json"
import { compose, rotateDEG, scale } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("reflecting and rotating a cutout composes its existing orientation", () => {
  const cutout = pcb_cutout_rect.parse({
    type: "pcb_cutout",
    shape: "rect",
    center: { x: 2, y: 1 },
    width: 4,
    height: 1,
    rotation: 30,
  })

  transformPCBElement(cutout, compose(rotateDEG(90), scale(1, -1)))

  expect(cutout.center.x).toBeCloseTo(1)
  expect(cutout.center.y).toBeCloseTo(2)
  // A centered rectangle at -120 degrees has the same orientation as 60 degrees.
  expect(cutout.rotation).toBeCloseTo(-120)
  expect(cutout.width).toBe(4)
  expect(cutout.height).toBe(1)
})
