import { expect, test } from "bun:test"
import { pcb_cutout_path } from "circuit-json"
import { translate } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("path cutout route moves during translation", () => {
  const cutout = pcb_cutout_path.parse({
    type: "pcb_cutout",
    shape: "path",
    route: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ],
    slot_width: 1,
  })

  transformPCBElement(cutout, translate(3, 1))

  expect(cutout.route).toEqual([
    { x: 3, y: 1 },
    { x: 5, y: 1 },
  ])
  expect(cutout.slot_width).toBe(1)
})
