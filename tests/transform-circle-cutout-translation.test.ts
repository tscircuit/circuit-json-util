import { expect, test } from "bun:test"
import { pcb_cutout_circle } from "circuit-json"
import { translate } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("translating a circular cutout moves its center and preserves its radius", () => {
  const cutout = pcb_cutout_circle.parse({
    type: "pcb_cutout",
    shape: "circle",
    center: { x: 2, y: -1 },
    radius: 1.5,
  })

  transformPCBElement(cutout, translate(3, 1))

  expect(cutout.center).toEqual({ x: 5, y: 0 })
  expect(cutout.radius).toBe(1.5)
})
