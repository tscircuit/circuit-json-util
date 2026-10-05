import { expect, test } from "bun:test"
import { pcb_cutout_path } from "circuit-json"
import { translate } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("path cutout route stays behind during translation", () => {
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

  // Records the bug; both route points should receive the translation.
  expect(cutout.route).toEqual([
    { x: 0, y: 0 },
    { x: 2, y: 0 },
  ])
  expect(cutout.slot_width).toBe(1)
})
